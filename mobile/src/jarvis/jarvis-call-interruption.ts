import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { OrcaXenoTalk } from '../../modules/orca-xeno-talk/src'
import type { JarvisCall } from './jarvis-call'
import type { JarvisVoice } from './jarvis-voice-preference'

// A call interrupted longer than this (a long phone call) isn't picked up again: it would start talking out of
// nowhere. Shorter ones (Siri, a notification's sound, an alarm, another app's audio) are.
export const RESUME_WITHIN_MS = 10 * 60_000

export type InterruptedCallHost = {
  /** Whether the call is still connected. */
  readonly connected: () => boolean
  /** Starts the call's audio again; false if it couldn't. */
  readonly restartAudio: () => boolean
  readonly report: (note: { readonly kind: string; readonly [detail: string]: unknown }) => void
  readonly now?: () => number
}

/**
 * Picks a Xeno call up again after something took the phone's audio (Siri, a phone call, another app): once the
 * audio is back (iOS says so, or the app comes back to the front, since iOS doesn't always say), a call still
 * connected gets its audio started again, and one that dropped meanwhile is called again. Hanging up forgets it.
 */
export class CallInterruption {
  private since: number | null = null
  private reconnect: (() => void) | null = null
  private unwatch: (() => void) | null = null

  constructor(private readonly host: InterruptedCallHost) {}

  /** A note from the phone: its audio interrupted, or back. */
  note(kind: string): void {
    if (kind === 'audio-interrupted' && this.host.connected() && this.since === null) {
      this.since = this.now()
      this.watch()
    } else if (kind === 'audio-resumed') {
      this.recover('audio-back')
    }
  }

  /** The call dropped: true if it was during an interruption, and it will be called again once audio is back. */
  dropped(callAgain: () => void): boolean {
    if (this.since === null) {
      return false
    }
    this.reconnect = callAgain
    return true
  }

  /** Hung up, or a new call: nothing to pick up. */
  forget(): void {
    this.since = null
    this.reconnect = null
    this.unwatch?.()
    this.unwatch = null
  }

  private recover(why: string): void {
    const { since, reconnect } = this
    if (since === null) {
      return
    }
    this.forget()
    if (this.now() - since > RESUME_WITHIN_MS) {
      return
    }
    if (reconnect) {
      reconnect()
    } else if (this.host.connected()) {
      this.host.report({ kind: 'call-resumed', why, ok: this.host.restartAudio() })
    }
  }

  // iOS doesn't always say the audio is back (not to an app in the background): the app coming back to the front
  // counts too.
  private watch(): void {
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        this.recover('app-active')
      }
    })
    this.unwatch = () => app.remove()
  }

  private now(): number {
    return this.host.now?.() ?? Date.now()
  }
}

/** The call's audio stopped and started again, which brings it back after an interruption. */
export function restartCallAudio(): boolean {
  return OrcaXenoTalk?.pauseCallAudio?.() === true && OrcaXenoTalk?.resumeCallAudio?.(true) === true
}

/**
 * Keeps `call` picked up after interruptions: watches the phone's audio notes and the call's own state (a drop
 * while interrupted calls again, hanging up forgets it). `offerUrl` and `voice` are the call's own, to call again.
 */
export function useCallResume(call: JarvisCall, offerUrl: string | null, voice: JarvisVoice): void {
  const again = useRef({ offerUrl, voice })
  again.current = { offerUrl, voice }
  useEffect(() => {
    const live = () => {
      const { phase } = call.getSnapshot()
      return phase !== 'idle' && phase !== 'error'
    }
    const interruption = new CallInterruption({
      connected: live,
      restartAudio: restartCallAudio,
      report: (note) => call.reportDevice(note)
    })
    const device = OrcaXenoTalk?.addListener('onDevice', (note) => interruption.note(note.kind))
    let was = call.getSnapshot().phase
    const unsubscribe = call.subscribe(() => {
      const { phase, error } = call.getSnapshot()
      if (phase === was) {
        return
      }
      was = phase
      const { offerUrl: url, voice: chosen } = again.current
      if (phase === 'error' && error === 'dropped' && url) {
        interruption.dropped(() => void call.start(url, chosen))
      } else if (phase === 'idle' || phase === 'error') {
        interruption.forget()
      }
    })
    return () => {
      device?.remove()
      unsubscribe()
      interruption.forget()
    }
  }, [call])
}
