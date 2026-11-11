import { describe, expect, it } from 'vitest'
import { micShouldBeOpen, openingClientMessages } from './jarvis-mic-gate'

describe('micShouldBeOpen', () => {
  it('keeps the mic shut until the call is connected', () => {
    expect(micShouldBeOpen({ handsFree: true, holding: true, connected: false })).toBe(false)
    expect(micShouldBeOpen({ handsFree: false, holding: true, connected: false })).toBe(false)
  })

  it('opens it in hands-free mode or while the talk control is held', () => {
    expect(micShouldBeOpen({ handsFree: true, holding: false, connected: true })).toBe(true)
    expect(micShouldBeOpen({ handsFree: false, holding: true, connected: true })).toBe(true)
  })

  it('shuts it once the talk control is let go, unless hands-free', () => {
    expect(micShouldBeOpen({ handsFree: false, holding: false, connected: true })).toBe(false)
  })
})

describe('openingClientMessages', () => {
  it('tells Jarvis what is on screen and that the talk button is already held', () => {
    expect(openingClientMessages({ viewing: 'repo::/w/a', holding: true })).toEqual([
      ['jarvis-context', { worktreeId: 'repo::/w/a' }],
      ['jarvis-ptt', { state: 'down' }]
    ])
    expect(openingClientMessages({ viewing: null, holding: false })).toEqual([])
  })
})
