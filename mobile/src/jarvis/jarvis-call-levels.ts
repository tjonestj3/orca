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
