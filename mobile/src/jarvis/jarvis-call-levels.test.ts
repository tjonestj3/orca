import { describe, expect, it, vi } from 'vitest'
import { JarvisLevelMeter, QUIET_POLL_EVERY, levelPoller, levelsMatter } from './jarvis-call-levels'

describe('reading the call’s levels', () => {
  it('matters while Xeno speaks, or the person is heard or holding', () => {
    expect(levelsMatter({ phase: 'speaking', holding: false })).toBe(true)
    expect(levelsMatter({ phase: 'hearing', holding: false })).toBe(true)
    expect(levelsMatter({ phase: 'listening', holding: true })).toBe(true)
    expect(levelsMatter({ phase: 'listening', holding: false })).toBe(false)
    expect(levelsMatter({ phase: 'thinking', holding: false })).toBe(false)
  })

  it('reads every tick while they matter and a tenth as often while nobody talks', () => {
    const meter = new JarvisLevelMeter()
    const poll = vi.spyOn(meter, 'poll').mockResolvedValue()
    let talking = false
    const tick = levelPoller(
      meter,
      {} as never,
      () => true,
      () => ({ micOpen: true, matters: talking })
    )
    for (let i = 0; i < QUIET_POLL_EVERY * 3; i++) {
      tick()
    }
    expect(poll).toHaveBeenCalledTimes(3)
    talking = true
    for (let i = 0; i < 5; i++) {
      tick()
    }
    expect(poll).toHaveBeenCalledTimes(8)
  })
})
