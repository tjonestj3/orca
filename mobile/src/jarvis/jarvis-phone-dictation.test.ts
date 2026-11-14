import { describe, expect, it, vi } from 'vitest'
import { PhoneDictation, type PhoneDictationDevice } from './jarvis-phone-dictation'

function fakeDevice(over: Partial<PhoneDictationDevice> = {}) {
  let pcm: ((pcm: Uint8Array) => void) | null = null
  let text: ((text: string) => void) | null = null
  const fed: number[] = []
  const log: string[] = []
  const device: PhoneDictationDevice = {
    available: async () => true,
    pauseCall: () => (log.push('pause'), true),
    resumeCall: (activate) => void log.push(`resume ${activate}`),
    openMic: async () => (log.push('open'), true),
    record: (on) => (log.push(`record ${on}`), true),
    closeMic: () => void log.push('close'),
    onPcm: (handler) => {
      pcm = handler
      return () => {
        pcm = null
      }
    },
    feed: (bytes) => void fed.push(bytes[0] ?? -1),
    start: async () => true,
    finish: async () => ' What is waiting on me? ',
    cancel: () => void log.push('cancel'),
    onText: (handler) => {
      text = handler
      return () => {
        text = null
      }
    },
    ...over
  }
  return {
    device,
    log,
    fed,
    hear: (byte: number) => pcm?.(new Uint8Array([byte])),
    say: (words: string) => text?.(words)
  }
}

describe('PhoneDictation', () => {
  it('pauses the call, listens, and hands back the text, starting the call audio again', async () => {
    const phone = fakeDevice()
    const dictation = new PhoneDictation(phone.device)
    const heard: string[] = []
    expect(await dictation.begin((t) => heard.push(t))).toBe(true)
    phone.say('What is')
    expect(await dictation.end()).toBe('What is waiting on me?')
    expect(heard).toEqual(['What is'])
    expect(phone.log).toEqual([
      'pause',
      'open',
      'record true',
      'record false',
      'record false',
      'close',
      'resume true'
    ])
  })

  it('keeps audio heard before the recognizer is armed, in order', async () => {
    let arm: (ok: boolean) => void = () => {}
    const phone = fakeDevice({ start: () => new Promise((resolve) => (arm = resolve)) })
    const dictation = new PhoneDictation(phone.device)
    const began = dictation.begin(() => {})
    await vi.waitFor(() => expect(phone.log).toContain('record true'))
    phone.hear(1)
    phone.hear(2)
    arm(true)
    await began
    phone.hear(3)
    expect(phone.fed).toEqual([1, 2, 3])
  })

  it('says no, touching nothing, when the phone has no recognizer ready', async () => {
    const phone = fakeDevice({ available: async () => false })
    const dictation = new PhoneDictation(phone.device)
    expect(await dictation.begin(() => {})).toBe(false)
    expect(phone.log).toEqual([])
    expect(await dictation.end()).toBeNull()
  })

  it('gives the call its audio back when the recognizer fails to start', async () => {
    const phone = fakeDevice({ start: async () => false })
    const dictation = new PhoneDictation(phone.device)
    expect(await dictation.begin(() => {})).toBe(false)
    expect(phone.log).toEqual([
      'pause',
      'open',
      'record true',
      'record false',
      'close',
      'resume true'
    ])
  })

  it('says no when the call audio cannot be paused, so the call keeps the microphone', async () => {
    const phone = fakeDevice({ pauseCall: () => false })
    const dictation = new PhoneDictation(phone.device)
    expect(await dictation.begin(() => {})).toBe(false)
    expect(phone.log).toEqual([])
  })

  it('a call ending mid-hold cancels without waking the call audio', async () => {
    const phone = fakeDevice()
    const dictation = new PhoneDictation(phone.device)
    await dictation.begin(() => {})
    dictation.cancel(true)
    await vi.waitFor(() => expect(phone.log).toContain('close'))
    expect(phone.log.slice(-4)).toEqual(['cancel', 'record false', 'close', 'resume false'])
    expect(await dictation.end()).toBeNull()
  })

  it('a finish that fails gives null and still hands the audio back', async () => {
    const phone = fakeDevice({
      finish: async () => {
        throw new Error('no')
      }
    })
    const dictation = new PhoneDictation(phone.device)
    await dictation.begin(() => {})
    expect(await dictation.end()).toBeNull()
    expect(phone.log.at(-1)).toBe('resume true')
  })

  it('a hold let go of while still setting up stops it and sends nothing', async () => {
    let arm: (ok: boolean) => void = () => {}
    const phone = fakeDevice({ start: () => new Promise((resolve) => (arm = resolve)) })
    const dictation = new PhoneDictation(phone.device)
    const began = dictation.begin(() => {})
    await vi.waitFor(() => expect(phone.log).toContain('record true'))
    dictation.cancel()
    arm(true)
    expect(await began).toBe(false)
    expect(phone.log.at(-1)).toBe('resume true')
  })
})
