import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined }
}))

const { MusicDucker, MUSIC_BACK_AFTER_MS } = await import('./jarvis-music')

const call = (phase: string, holding = false) => ({ phase, holding }) as never

describe('your music under Xeno, the way Maps does it', () => {
  let ducked: boolean[]
  let ducker: InstanceType<typeof MusicDucker>
  beforeEach(() => {
    vi.useFakeTimers()
    ducked = []
    ducker = new MusicDucker((on) => ducked.push(on))
  })
  afterEach(() => vi.useRealTimers())

  it('turns down while Xeno speaks and comes back up a moment after', () => {
    ducker.follow(call('listening'))
    expect(ducked).toEqual([])
    ducker.follow(call('speaking'))
    expect(ducked).toEqual([true])
    ducker.follow(call('listening'))
    vi.advanceTimersByTime(MUSIC_BACK_AFTER_MS - 1)
    expect(ducked).toEqual([true])
    vi.advanceTimersByTime(1)
    expect(ducked).toEqual([true, false])
  })

  it('stays down across the pause between two of Xeno’s sentences', () => {
    ducker.follow(call('speaking'))
    ducker.follow(call('thinking'))
    vi.advanceTimersByTime(MUSIC_BACK_AFTER_MS / 2)
    ducker.follow(call('speaking'))
    vi.advanceTimersByTime(MUSIC_BACK_AFTER_MS * 2)
    expect(ducked).toEqual([true])
  })

  it('turns down while you hold the orb to talk', () => {
    ducker.follow(call('listening', true))
    expect(ducked).toEqual([true])
  })

  it('comes straight back up when the call ends', () => {
    ducker.follow(call('speaking'))
    ducker.stop()
    expect(ducked).toEqual([true, false])
    vi.advanceTimersByTime(MUSIC_BACK_AFTER_MS)
    expect(ducked).toEqual([true, false])
  })
})
