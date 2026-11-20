import type { RTCPeerConnection } from 'react-native-webrtc'
import { audioLevelsFromStats } from './jarvis-call-signaling'
import { QUIET, type JarvisLevels } from './jarvis-call-types'
import { ReplyLevelTracker, type ReplyLevel } from './jarvis-reply-level'

type ReplyLevelNote = ReplyLevel & { readonly kind: 'reply-level'; readonly at: number }

// How loud each side of a call sounds, read from WebRTC's stats; drives the orb.
export class JarvisLevelMeter {
  private levels: JarvisLevels = QUIET
  private readonly listeners = new Set<() => void>()
  private readonly replies = new ReplyLevelTracker()

  // report: how loud each finished reply arrived, start against end, as a note for the desktop's log.
  constructor(private readonly report: (note: ReplyLevelNote) => void = () => {}) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly get = (): JarvisLevels => this.levels

  // current: whether the call polled is still the live one; micOpen: whether the person's side counts.
  async poll(pc: RTCPeerConnection, current: () => boolean, micOpen: () => boolean): Promise<void> {
    let report: Map<string, { type?: string; kind?: string; audioLevel?: number }>
    try {
      report = await pc.getStats()
    } catch {
      return
    }
    if (current()) {
      const { user, bot } = audioLevelsFromStats(report)
      this.set({ user: micOpen() ? user : 0, bot })
      const reply = this.replies.feed(bot, Date.now())
      if (reply) {
        this.report({ kind: 'reply-level', ...reply, at: Date.now() })
      }
    }
  }

  set(next: JarvisLevels): void {
    if (next.user === this.levels.user && next.bot === this.levels.bot) {
      return
    }
    this.levels = next
    this.listeners.forEach((listener) => listener())
  }
}

/** While nobody is talking or being heard, the levels are read this many times less often: the orb is at rest. */
export const QUIET_POLL_EVERY = 10

/** Whether the call's levels matter now: Xeno speaking, or the person heard or holding to talk. */
export function levelsMatter(s: { readonly phase: string; readonly holding: boolean }): boolean {
  return s.phase === 'speaking' || s.phase === 'hearing' || s.holding
}

/**
 * One tick of the call's level polling: every tick while levels matter, every QUIET_POLL_EVERYth otherwise, which
 * still sees a reply's last words fade (for its level note) and lets the orb settle, at a tenth of the reads.
 */
export function levelPoller(
  meter: JarvisLevelMeter,
  pc: RTCPeerConnection,
  current: () => boolean,
  side: () => { readonly micOpen: boolean; readonly matters: boolean }
): () => void {
  let tick = 0
  return () => {
    tick++
    if (side().matters || tick % QUIET_POLL_EVERY === 0) {
      void meter.poll(pc, current, () => side().micOpen)
    }
  }
}
