import { Platform } from 'react-native'
import { mediaDevices, RTCPeerConnection, type MediaStream } from 'react-native-webrtc'
import {
  preferSpeakerForCallIOS,
  requestMicrophonePermissionsAsync
} from '@orca/expo-two-way-audio'
import { nativeMicrophoneScreenLock } from '../platform/native-audio-device'
import {
  IDLE_JARVIS_CALL,
  reduceJarvisMessage,
  RTVI_LABEL,
  type JarvisCallState
} from './jarvis-call-state'
import type { JarvisVoice } from './jarvis-voice-preference'

type DataChannel = ReturnType<RTCPeerConnection['createDataChannel']>

export type JarvisCallError = 'microphone' | 'unreachable' | 'dropped'

export type JarvisCallSnapshot = JarvisCallState & {
  readonly muted: boolean
  readonly error: JarvisCallError | null
}

// 0..1, roughly how loud each side sounds; drives the orb.
export type JarvisLevels = { readonly user: number; readonly bot: number }

const IDLE_SNAPSHOT: JarvisCallSnapshot = { ...IDLE_JARVIS_CALL, muted: false, error: null }
const QUIET: JarvisLevels = { user: 0, bot: 0 }
const OFFER_TIMEOUT_MS = 10_000
const ICE_GATHER_TIMEOUT_MS = 2_500
const LEVEL_POLL_MS = 100

// One voice call to the Jarvis server on the paired desktop: WebRTC audio both ways plus a data channel of RTVI events.
export class JarvisCall {
  private snapshot: JarvisCallSnapshot = IDLE_SNAPSHOT
  private levels: JarvisLevels = QUIET
  private readonly listeners = new Set<() => void>()
  private readonly levelListeners = new Set<() => void>()
  private pc: RTCPeerConnection | null = null
  private mic: MediaStream | null = null
  private channel: DataChannel | null = null
  private timers: ReturnType<typeof setInterval>[] = []
  // Bumped on every start and hang-up so late async steps of an abandoned call do nothing.
  private generation = 0

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): JarvisCallSnapshot => this.snapshot

  readonly subscribeLevels = (listener: () => void): (() => void) => {
    this.levelListeners.add(listener)
    return () => this.levelListeners.delete(listener)
  }

  readonly getLevels = (): JarvisLevels => this.levels

  // A request from a tap (a worktree's update, "talk about this"): sent into a live call, or opens one with it.
  ask(text: string, offerUrl: string, voice: JarvisVoice): void {
    const channel = this.channel
    if (channel?.readyState === 'open') {
      channel.send(
        JSON.stringify({
          label: RTVI_LABEL,
          type: 'client-message',
          id: `orca-${Date.now()}`,
          data: { t: 'jarvis-ask', d: { text } }
        })
      )
      return
    }
    void this.start(offerUrl, voice, text)
  }

  async start(offerUrl: string, voice: JarvisVoice, ask?: string): Promise<void> {
    this.teardown()
    const generation = ++this.generation
    this.set({ ...IDLE_SNAPSHOT, phase: 'connecting', muted: this.snapshot.muted })

    const permission = await requestMicrophonePermissionsAsync().catch(() => null)
    if (!permission?.granted) {
      return this.fail(generation, 'microphone')
    }
    let mic: MediaStream
    try {
      mic = await mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      return this.fail(generation, 'microphone')
    }
    if (generation !== this.generation) {
      mic.getTracks().forEach((track) => track.stop())
      return
    }

    const pc = new RTCPeerConnection({ iceServers: [] })
    this.pc = pc
    this.mic = mic
    nativeMicrophoneScreenLock.hold()
    mic.getAudioTracks().forEach((track) => {
      track.enabled = !this.snapshot.muted
      pc.addTrack(track, mic)
    })

    const channel = pc.createDataChannel('jarvis', { ordered: true })
    this.channel = channel
    channel.addEventListener('open', () => {
      channel.send(
        JSON.stringify({
          label: RTVI_LABEL,
          type: 'client-ready',
          id: `orca-${Date.now()}`,
          data: { version: '1.0.0', about: { library: 'orca-mobile' } }
        })
      )
      // The server treats a call without pings for three seconds as gone.
      this.every(1000, () => {
        if (channel.readyState === 'open') {
          channel.send(`ping: ${Date.now()}`)
        }
      })
    })
    channel.addEventListener('message', (event) => {
      if (generation !== this.generation || typeof event.data !== 'string') {
        return
      }
      let message: unknown
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      this.set({ ...this.snapshot, ...reduceJarvisMessage(this.snapshot, message) })
    })
    pc.addEventListener('connectionstatechange', () => {
      if (generation !== this.generation) {
        return
      }
      if (pc.connectionState === 'connected') {
        if (Platform.OS === 'ios') {
          preferSpeakerForCallIOS(true)
        }
        if (this.snapshot.phase === 'connecting') {
          this.set({ ...this.snapshot, phase: 'listening' })
        }
        this.every(LEVEL_POLL_MS, () => void this.pollLevels(pc, generation))
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.fail(generation, 'dropped')
      }
    })

    try {
      await pc.setLocalDescription(await pc.createOffer({}))
      await iceGathered(pc)
      const answer = await postOffer(offerUrl, {
        sdp: pc.localDescription?.sdp,
        type: pc.localDescription?.type,
        request_data: ask ? { voice, ask } : { voice }
      })
      if (generation !== this.generation) {
        return
      }
      await pc.setRemoteDescription({ sdp: answer.sdp, type: answer.type })
    } catch {
      this.fail(generation, 'unreachable')
    }
  }

  hangUp(): void {
    this.generation++
    this.teardown()
    this.set({ ...IDLE_SNAPSHOT, muted: this.snapshot.muted })
  }

  setMuted(muted: boolean): void {
    this.mic?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
    this.set({ ...this.snapshot, muted })
  }

  private fail(generation: number, error: JarvisCallError): void {
    if (generation !== this.generation) {
      return
    }
    this.generation++
    this.teardown()
    this.set({ ...IDLE_SNAPSHOT, phase: 'error', error, muted: this.snapshot.muted })
  }

  private teardown(): void {
    this.timers.forEach(clearInterval)
    this.timers = []
    const { pc, mic } = this
    this.pc = null
    this.mic = null
    this.channel = null
    if (pc) {
      pc.close()
      if (Platform.OS === 'ios') {
        preferSpeakerForCallIOS(false)
      }
    }
    if (mic) {
      mic.getTracks().forEach((track) => track.stop())
      nativeMicrophoneScreenLock.release()
    }
    this.setLevels(QUIET)
  }

  private every(ms: number, tick: () => void): void {
    this.timers.push(setInterval(tick, ms))
  }

  private async pollLevels(pc: RTCPeerConnection, generation: number): Promise<void> {
    let report: Map<string, { type?: string; kind?: string; audioLevel?: number }>
    try {
      report = await pc.getStats()
    } catch {
      return
    }
    if (generation !== this.generation) {
      return
    }
    let user = 0
    let bot = 0
    report.forEach((stat) => {
      if (stat.kind !== 'audio' || typeof stat.audioLevel !== 'number') {
        return
      }
      if (stat.type === 'inbound-rtp') {
        bot = loudness(stat.audioLevel)
      } else if (stat.type === 'media-source') {
        user = loudness(stat.audioLevel)
      }
    })
    this.setLevels({ user: this.snapshot.muted ? 0 : user, bot })
  }

  private set(next: JarvisCallSnapshot): void {
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }

  private setLevels(next: JarvisLevels): void {
    if (next.user === this.levels.user && next.bot === this.levels.bot) {
      return
    }
    this.levels = next
    this.levelListeners.forEach((listener) => listener())
  }
}

// WebRTC's audioLevel is linear amplitude; the square root reads closer to how loud speech sounds.
function loudness(audioLevel: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, audioLevel)) * 1.6)
}

function iceGathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const done = (): void => {
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = (): void => {
      if (pc.iceGatheringState === 'complete') {
        done()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
    setTimeout(done, ICE_GATHER_TIMEOUT_MS)
  })
}

async function postOffer(
  url: string,
  offer: {
    sdp?: string
    type?: string | null
    request_data: { voice: JarvisVoice; ask?: string }
  }
): Promise<{ sdp: string; type: 'answer' }> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), OFFER_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
      signal: abort.signal
    })
    if (!response.ok) {
      throw new Error(`Jarvis answered ${response.status}`)
    }
    return (await response.json()) as { sdp: string; type: 'answer' }
  } finally {
    clearTimeout(timer)
  }
}
