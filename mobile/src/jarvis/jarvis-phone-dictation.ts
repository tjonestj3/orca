// Holding the talk button with the iPhone's own dictation: while held, the call's audio pauses and Apple's
// on-device recognizer has the microphone; letting go hands Xeno the text. "Hey Xeno" listening is unchanged:
// it still goes through the call to the desktop.

export type PhoneDictationDevice = {
  // Whether the recognizer is installed and ready for English on this phone.
  readonly available: () => Promise<boolean>
  // Stops the call's audio so the dictation engine can have the microphone; false if it couldn't.
  readonly pauseCall: () => boolean
  // Starts the call's audio again; activate is false when the call is ending anyway.
  readonly resumeCall: (activate: boolean) => void
  readonly openMic: () => Promise<boolean>
  readonly record: (on: boolean) => boolean
  readonly closeMic: () => void
  readonly onPcm: (handler: (pcm: Uint8Array) => void) => () => void
  readonly feed: (pcm: Uint8Array) => void
  readonly start: () => Promise<boolean>
  readonly finish: () => Promise<string>
  readonly cancel: () => void
  // Everything heard so far, as the recognizer revises it.
  readonly onText: (handler: (text: string) => void) => () => void
}

type Session = {
  began: Promise<boolean>
  // Let go of, or the call ended, before the phone was listening: stop setting it up.
  cancelled: boolean
  // The call is going, so its audio isn't started again.
  ending: boolean
  release: () => void
}

export class PhoneDictation {
  private ready: Promise<boolean> | null = null
  private session: Session | null = null

  constructor(private readonly device: PhoneDictationDevice) {}

  // Asked once per app run while it says yes; a no (not downloaded yet, an older phone) is asked again next hold.
  private isAvailable(): Promise<boolean> {
    const ready = this.ready ?? this.device.available().catch(() => false)
    this.ready = ready
    void ready.then((yes) => {
      if (!yes && this.ready === ready) {
        this.ready = null
      }
    })
    return ready
  }

  // True once the phone is listening; false means the call's own microphone should be used instead.
  begin(onText: (text: string) => void): Promise<boolean> {
    this.cancel()
    const device = this.device
    let stopText = (): void => {}
    let stopPcm = (): void => {}
    let paused = false
    let opened = false
    const session: Session = {
      began: Promise.resolve(false),
      cancelled: false,
      ending: false,
      release: () => {
        stopText()
        stopPcm()
        if (opened) {
          device.record(false)
          device.closeMic()
        }
        if (paused) {
          device.resumeCall(!session.ending)
        }
        opened = false
        paused = false
      }
    }
    const run = async (): Promise<boolean> => {
      if (!(await this.isAvailable()) || session.cancelled) {
        return false
      }
      paused = device.pauseCall()
      if (!paused) {
        return false
      }
      // Audio heard before the recognizer is armed waits here, so the first words aren't lost.
      const early: Uint8Array[] = []
      let armed = false
      stopPcm = device.onPcm((pcm) => {
        if (armed) {
          device.feed(pcm)
        } else {
          early.push(pcm)
        }
      })
      stopText = device.onText((text) => {
        if (!session.cancelled) {
          onText(text)
        }
      })
      const [micOpen, started] = await Promise.all([
        device.openMic().then((ok) => {
          opened = ok
          return ok && device.record(true)
        }),
        device.start().catch(() => false)
      ])
      if (!micOpen || !started || session.cancelled) {
        if (started) {
          device.cancel()
        }
        return false
      }
      armed = true
      early.splice(0).forEach((pcm) => device.feed(pcm))
      return true
    }
    session.began = run()
      .catch(() => false)
      .then((ok) => {
        if (!ok) {
          session.release()
          if (this.session === session) {
            this.session = null
          }
        }
        return ok
      })
    this.session = session
    return session.began
  }

  // What was said, once the button is let go; null if the phone wasn't listening or couldn't make it out.
  async end(): Promise<string | null> {
    const session = this.session
    if (!session || !(await session.began) || this.session !== session) {
      return null
    }
    this.session = null
    this.device.record(false)
    let text: string | null
    try {
      text = (await this.device.finish()).trim()
    } catch {
      text = null
    }
    session.release()
    return text
  }

  // A tap that wasn't talk, or the call ending (ending): nothing is sent.
  cancel(ending = false): void {
    const session = this.session
    if (!session) {
      return
    }
    this.session = null
    session.cancelled = true
    session.ending = ending
    void session.began.then((ok) => {
      if (ok) {
        this.device.cancel()
        session.release()
      }
    })
  }
}
