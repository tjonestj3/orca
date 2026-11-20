import { describe, expect, it, vi } from 'vitest'
import { CallDictation, type DictationCallHost } from './jarvis-call-dictation'
import { IDLE_SNAPSHOT, type JarvisCallSnapshot } from './jarvis-call-types'
import type { PhoneDictation } from './jarvis-phone-dictation'

function call(phone: Partial<PhoneDictation>) {
  let snapshot: JarvisCallSnapshot = { ...IDLE_SNAPSHOT, phase: 'listening', holding: true }
  const sent: [string, object][] = []
  const throughCall = vi.fn()
  const host: DictationCallHost = {
    snapshot: () => snapshot,
    set: (next) => {
      snapshot = next
    },
    send: (type, data) => (sent.push([type, data]), true),
    generation: () => 1,
    touch: () => {},
    holdThroughCall: throughCall
  }
  const dictation = new CallDictation(phone as PhoneDictation, host)
  dictation.on = true
  return { dictation, sent, throughCall, snapshot: () => snapshot }
}

describe('CallDictation', () => {
  it('stops Xeno as the hold starts, shows the words, and sends them on letting go', async () => {
    let onText: (text: string) => void = () => {}
    const c = call({
      begin: (handler) => ((onText = handler), Promise.resolve(true)),
      end: async () => 'what is waiting on me'
    })
    expect(c.dictation.begin(true)).toBe(true)
    expect(c.sent).toEqual([['jarvis-dictation', { state: 'start' }]])
    onText('what is')
    expect(c.snapshot().dictating).toBe('what is')
    expect(c.dictation.release()).toBe(true)
    await vi.waitFor(() => expect(c.sent).toHaveLength(2))
    expect(c.sent[1]).toEqual([
      'jarvis-dictation',
      { state: 'text', text: 'what is waiting on me', readyMs: expect.any(Number) }
    ])
    expect(c.snapshot()).toMatchObject({ dictating: null, heard: 'what is waiting on me' })
  })

  it('says how long after letting go the text was ready', async () => {
    vi.useFakeTimers()
    try {
      const c = call({
        begin: async () => true,
        end: () => new Promise((done) => setTimeout(() => done('status'), 420))
      })
      c.dictation.begin(true)
      await vi.advanceTimersByTimeAsync(0)
      c.dictation.release()
      await vi.advanceTimersByTimeAsync(420)
      expect(c.sent[1]).toEqual(['jarvis-dictation', { state: 'text', text: 'status', readyMs: 420 }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends a cancel when nothing was made out', async () => {
    const c = call({ begin: async () => true, end: async () => '' })
    c.dictation.begin(true)
    c.dictation.release()
    await vi.waitFor(() => expect(c.sent).toHaveLength(2))
    expect(c.sent[1]).toEqual(['jarvis-dictation', { state: 'cancel' }])
  })

  it('leaves the hold to the call when off, not ready, or the phone cannot listen', async () => {
    const off = call({ begin: async () => true })
    off.dictation.on = false
    expect(off.dictation.begin(true)).toBe(false)
    expect(call({ begin: async () => true }).dictation.begin(false)).toBe(false)

    const cannot = call({ begin: async () => false })
    expect(cannot.dictation.begin(true)).toBe(true)
    await vi.waitFor(() => expect(cannot.throughCall).toHaveBeenCalledOnce())
    expect(cannot.snapshot().dictating).toBeNull()
    expect(cannot.dictation.release()).toBe(false)
  })

  it('a tap that was not talk cancels the phone and tells Xeno', () => {
    const cancel = vi.fn()
    const c = call({ begin: async () => true, cancel })
    c.dictation.begin(true)
    expect(c.dictation.cancel()).toBe(true)
    expect(cancel).toHaveBeenCalledWith()
    expect(c.sent.at(-1)).toEqual(['jarvis-dictation', { state: 'cancel' }])
  })

  it('the call ending mid-hold cancels without waking the call audio', () => {
    const cancel = vi.fn()
    const c = call({ begin: async () => true, cancel })
    c.dictation.begin(true)
    c.dictation.stop()
    expect(cancel).toHaveBeenCalledWith(true)
  })
})
