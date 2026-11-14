import { describe, expect, it } from 'vitest'
import { micShouldBeOpen, openingClientMessages } from './jarvis-mic-gate'

describe('micShouldBeOpen', () => {
  it('keeps the mic shut until the call is connected', () => {
    expect(micShouldBeOpen({ wake: true, holding: true, connected: false })).toBe(false)
  })

  it('keeps it open for "Hey Xeno", which listens for its name', () => {
    expect(micShouldBeOpen({ wake: true, holding: false, connected: true })).toBe(true)
  })

  it('opens it while the talk control is held, and shuts it after without "Hey Xeno"', () => {
    expect(micShouldBeOpen({ wake: false, holding: true, connected: true })).toBe(true)
    expect(micShouldBeOpen({ wake: false, holding: false, connected: true })).toBe(false)
  })
})

describe('openingClientMessages', () => {
  it('tells Jarvis what is on screen and that the talk button is already held', () => {
    expect(openingClientMessages({ viewing: 'repo::/w/a', holding: true, wake: false })).toEqual([
      ['jarvis-context', { worktreeId: 'repo::/w/a' }],
      ['jarvis-ptt', { state: 'down' }]
    ])
    expect(openingClientMessages({ viewing: null, holding: false, wake: false })).toEqual([])
  })
})

describe('openingClientMessages with "Hey Xeno"', () => {
  it('tells Xeno to wait for its name', () => {
    expect(openingClientMessages({ viewing: null, holding: false, wake: true })).toEqual([
      ['jarvis-wake', { on: true }]
    ])
  })
})
