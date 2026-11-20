import type { JarvisCallSnapshot } from './jarvis-call-types'
import type { PhoneDictation } from './jarvis-phone-dictation'

// What a hold heard by the phone's own dictation needs from the call.
export type DictationCallHost = {
  readonly snapshot: () => JarvisCallSnapshot
  readonly set: (next: JarvisCallSnapshot) => void
  readonly send: (type: string, data: object) => boolean
  // Changes whenever the call starts or ends, so late steps of a finished one do nothing.
  readonly generation: () => number
  readonly touch: () => void
  // The phone couldn't listen after all: the hold goes through the call's microphone.
  readonly holdThroughCall: () => void
}

// A hold heard by the iPhone's own dictation rather than through the call: Xeno stops talking as it starts
// ("jarvis-dictation" start), the words show as they come, and letting go sends the text.
export class CallDictation {
  on = false
  // The hold being heard, until it's let go of.
  private turn: Promise<boolean> | null = null

  constructor(
    private readonly dictation: PhoneDictation | null,
    private readonly host: DictationCallHost
  ) {}

  // Takes this hold if it can: on, the call up, the app in front (a locked phone keeps the call's microphone).
  begin(ready: boolean): boolean {
    const { dictation, host } = this
    if (!dictation || !this.on || !ready || !host.send('jarvis-dictation', { state: 'start' })) {
      return false
    }
    const generation = host.generation()
    host.set({ ...host.snapshot(), dictating: '' })
    const turn = dictation.begin((text) => {
      if (generation === host.generation() && host.snapshot().dictating !== null) {
        host.touch()
        host.set({ ...host.snapshot(), dictating: text })
      }
    })
    this.turn = turn
    void turn.then((listening) => {
      if (listening || this.turn !== turn || generation !== host.generation()) {
        return
      }
      this.turn = null
      host.set({ ...host.snapshot(), dictating: null })
      if (host.snapshot().holding) {
        host.holdThroughCall()
      }
    })
    return true
  }

  // Letting go: true if this hold was the phone's, whose text is now on its way.
  release(): boolean {
    if (!this.turn) {
      return false
    }
    this.turn = null
    void this.sendText(this.host.generation(), Date.now())
    return true
  }

  // A tap that wasn't talk: true if this hold was the phone's.
  cancel(): boolean {
    if (!this.turn) {
      return false
    }
    this.turn = null
    this.dictation?.cancel()
    this.host.set({ ...this.host.snapshot(), dictating: null })
    this.host.send('jarvis-dictation', { state: 'cancel' })
    return true
  }

  // The call is ending.
  stop(): void {
    if (this.turn) {
      this.turn = null
      this.dictation?.cancel(true)
    }
  }

  // letGoAt is when the button was let go. readyMs, how long the phone then took to have the text, tells Xeno
  // whether the phone hears faster than the desktop's Whisper; it's timed on this clock alone.
  private async sendText(generation: number, letGoAt: number): Promise<void> {
    const { host } = this
    const text = (await this.dictation?.end()) ?? null
    if (generation !== host.generation()) {
      return
    }
    const readyMs = Math.max(0, Math.round(Date.now() - letGoAt))
    host.set({ ...host.snapshot(), dictating: null, ...(text ? { heard: text } : {}) })
    host.send('jarvis-dictation', text ? { state: 'text', text, readyMs } : { state: 'cancel' })
  }
}
