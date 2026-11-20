import { describe, expect, it, vi } from 'vitest'

const appListeners: ((state: string) => void)[] = []
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_: string, listener: (state: string) => void) => {
      appListeners.push(listener)
      return { remove: () => appListeners.splice(appListeners.indexOf(listener), 1) }
    }
  }
}))
vi.mock('../../modules/orca-xeno-talk/src', () => ({ OrcaXenoTalk: null }))

const { CallInterruption, RESUME_WITHIN_MS } = await import('./jarvis-call-interruption')

function setUp(connected = true) {
  let now = 0
  const host = {
    up: connected,
    restarts: 0,
    notes: [] as { kind: string }[]
  }
  const interruption = new CallInterruption({
    connected: () => host.up,
    restartAudio: () => {
      host.restarts += 1
      return true
    },
    report: (note) => void host.notes.push(note),
    now: () => now
  })
  return { host, interruption, later: (ms: number) => void (now += ms) }
}

describe('a call interrupted (Siri, a phone call, another app)', () => {
  it('gets its audio started again when iOS says the audio is back', () => {
    const { host, interruption } = setUp()
    interruption.note('audio-interrupted')
    interruption.note('audio-resumed')
    expect(host.restarts).toBe(1)
    expect(host.notes).toEqual([{ kind: 'call-resumed', why: 'audio-back', ok: true }])
  })

  it('or when the app comes back to the front, since iOS doesn’t always say', () => {
    const { host, interruption } = setUp()
    interruption.note('audio-interrupted')
    appListeners.forEach((listener) => listener('active'))
    expect(host.restarts).toBe(1)
    expect(appListeners).toHaveLength(0) // stops watching once picked up
  })

  it('is called again if it dropped meanwhile', () => {
    const { host, interruption } = setUp()
    const callAgain = vi.fn()
    interruption.note('audio-interrupted')
    host.up = false
    expect(interruption.dropped(callAgain)).toBe(true)
    interruption.note('audio-resumed')
    expect(callAgain).toHaveBeenCalledOnce()
    expect(host.restarts).toBe(0)
  })

  it('isn’t picked up after a long interruption, a hang-up, or a drop with nothing interrupted', () => {
    const long = setUp()
    long.interruption.note('audio-interrupted')
    long.later(RESUME_WITHIN_MS + 1)
    long.interruption.note('audio-resumed')
    expect(long.host.restarts).toBe(0)

    const hungUp = setUp()
    hungUp.interruption.note('audio-interrupted')
    hungUp.interruption.forget()
    hungUp.interruption.note('audio-resumed')
    expect(hungUp.host.restarts).toBe(0)

    const plainDrop = setUp()
    expect(plainDrop.interruption.dropped(vi.fn())).toBe(false)
  })

  it('ignores an interruption with no call', () => {
    const { host, interruption } = setUp(false)
    interruption.note('audio-interrupted')
    interruption.note('audio-resumed')
    expect(host.restarts).toBe(0)
  })
})
