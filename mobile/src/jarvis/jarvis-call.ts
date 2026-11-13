import { Platform } from 'react-native'
import { mediaDevices, RTCPeerConnection, type MediaStream } from 'react-native-webrtc'
import {
  preferSpeakerForCallIOS,
  requestMicrophonePermissionsAsync
} from '@orca/expo-two-way-audio'
import { nativeMicrophoneScreenLock } from '../platform/native-audio-device'
import { reduceJarvisMessage, RTVI_LABEL } from './jarvis-call-state'
import {
  audioLevelsFromStats,
  iceGathered,
  clientReadyMessage,
  parseChannelData,
  postOffer
} from './jarvis-call-signaling'
import {
  IDLE_CHECK_MS,
  IDLE_SNAPSHOT,
  jarvisIdleHangUpMs,
  QUIET,
  type JarvisCallError,
  type JarvisCallSnapshot,
  type JarvisLevels,
  type JarvisOpening
} from './jarvis-call-types'
import { micShouldBeOpen, openingClientMessages } from './jarvis-mic-gate'
import type { JarvisVoice } from './jarvis-voice-preference'

type DataChannel = ReturnType<RTCPeerConnection['createDataChannel']>

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
  private connected = false
  private viewing: string | null = null
  private lastActivityAt = 0
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
    if (!this.sendClientMessage('jarvis-ask', { text })) {
      void this.start(offerUrl, voice, { ask: text })
    }
  }

  // Holding a talk control: opens the mic, starting the call first if there isn't one.
  pressTalk(offerUrl: string, voice: JarvisVoice): void {
    this.lastActivityAt = Date.now()
    this.set({ ...this.snapshot, holding: true })
    if (!this.pc) {
      void this.start(offerUrl, voice)
      return
    }
    this.applyMic()
    this.sendClientMessage('jarvis-ptt', { state: 'down' })
  }

  // Letting go ends the person's turn at once rather than waiting for silence.
  releaseTalk(): void {
    if (!this.snapshot.holding) {
      return
    }
    this.set({ ...this.snapshot, holding: false })
    this.applyMic()
    if (this.connected) {
      this.sendClientMessage('jarvis-ptt', { state: 'up' })
    }
  }

  // A tap that turned out not to be talk: shut the mic and say nothing to Jarvis.
  cancelTalk(): void {
    this.set({ ...this.snapshot, holding: false })
    this.applyMic()
    this.sendClientMessage('jarvis-ptt', { state: 'cancel' })
  }

  setWake(on: boolean): void {
    this.set({ ...this.snapshot, wake: on })
    this.applyMic()
    this.sendClientMessage('jarvis-wake', { on })
  }

  setHandsFree(on: boolean): void {
    this.set({ ...this.snapshot, handsFree: on })
    this.applyMic()
  }

  // For the server's log: the phone locking or its audio being interrupted, which is why a locked phone goes unheard.
  reportDevice(note: { readonly kind: string; readonly at?: number }): void {
    this.sendClientMessage('jarvis-device', { ...note, at: note.at ?? Date.now() })
  }

  // The worktree the app has open, so "this" means it; sent now or when the call connects.
  setViewing(worktreeId: string | null): void {
    if (worktreeId === this.viewing) {
      return
    }
    this.viewing = worktreeId
    this.sendClientMessage('jarvis-context', { worktreeId })
  }

  // True when there was a call to end.
  endFor(reason: 'dictation'): boolean {
    if (!this.pc) {
      return false
    }
    this.fail(this.generation, reason)
    return true
  }

  // Play a message again (the last one without an id): Jarvis says it after whatever is playing, or
  // opens a call that starts with it.
  replay(id: number | undefined, offerUrl: string, voice: JarvisVoice): void {
    if (!this.sendClientMessage('jarvis-replay', { id: id ?? null })) {
      void this.start(offerUrl, voice, { replay: id ?? 'last' })
    }
  }

  private sendClientMessage(t: string, d: object): boolean {
    const channel = this.channel
    if (channel?.readyState !== 'open') {
      return false
    }
    channel.send(
      JSON.stringify({
        label: RTVI_LABEL,
        type: 'client-message',
        id: `orca-${Date.now()}`,
        data: { t, d }
      })
    )
    return true
  }

  async start(offerUrl: string, voice: JarvisVoice, opening?: JarvisOpening): Promise<void> {
    this.teardown()
    const generation = ++this.generation
    this.set({ ...this.idleKeepingChoices(), phase: 'connecting' })

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
      track.enabled = false
      pc.addTrack(track, mic)
    })

    const channel = pc.createDataChannel('jarvis', { ordered: true })
    this.channel = channel
    channel.addEventListener('open', () => {
      channel.send(clientReadyMessage())
      openingClientMessages({
        viewing: this.viewing,
        holding: this.snapshot.holding,
        wake: this.snapshot.wake
      }).forEach(([type, data]) => this.sendClientMessage(type, data))
      // The server treats a call without pings for three seconds as gone.
      this.every(1000, () => {
        if (channel.readyState === 'open') {
          channel.send(`ping: ${Date.now()}`)
        }
      })
    })
    channel.addEventListener('message', (event) => {
      const message = generation === this.generation ? parseChannelData(event.data) : null
      if (message === null) {
        return
      }
      const next = reduceJarvisMessage(this.snapshot, message, {
        waitingForName: this.snapshot.wake && !this.snapshot.holding
      })
      if (
        next.phase !== this.snapshot.phase &&
        (next.phase === 'hearing' || next.phase === 'speaking')
      ) {
        this.lastActivityAt = Date.now()
      }
      this.set({ ...this.snapshot, ...next })
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
        this.connected = true
        this.lastActivityAt = Date.now()
        this.applyMic()
        this.every(LEVEL_POLL_MS, () => void this.pollLevels(pc, generation))
        this.every(IDLE_CHECK_MS, () => {
          if (Date.now() - this.lastActivityAt > jarvisIdleHangUpMs(this.snapshot)) {
            this.fail(generation, 'idle')
          }
        })
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
        request_data: { voice, ...opening }
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
    this.set(this.idleKeepingChoices())
  }

  private idleKeepingChoices(): JarvisCallSnapshot {
    const { handsFree, wake, holding } = this.snapshot
    return { ...IDLE_SNAPSHOT, handsFree, wake, holding }
  }

  private micOpen(): boolean {
    return micShouldBeOpen({ ...this.snapshot, connected: this.connected })
  }

  private applyMic(): void {
    const open = this.micOpen()
    this.mic?.getAudioTracks().forEach((track) => {
      track.enabled = open
    })
  }

  private fail(generation: number, error: JarvisCallError): void {
    if (generation !== this.generation) {
      return
    }
    this.generation++
    this.teardown()
    this.set({ ...this.idleKeepingChoices(), holding: false, phase: 'error', error })
  }

  private teardown(): void {
    this.timers.forEach(clearInterval)
    this.timers = []
    const { pc, mic } = this
    this.pc = null
    this.mic = null
    this.channel = null
    this.connected = false
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
    const { user, bot } = audioLevelsFromStats(report)
    const micOpen = this.micOpen()
    this.setLevels({ user: micOpen ? user : 0, bot })
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
