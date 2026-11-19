import { describe, expect, it } from 'vitest'
import { keyboardPadding, stageOrbSize } from './jarvis-screen-layout'

describe('stageOrbSize', () => {
  it('leaves the folded Duo room for the worktree list and conversation', () => {
    expect(stageOrbSize(375, 667)).toBeLessThanOrEqual(104)
  })

  it('grows on a big screen, up to a cap', () => {
    expect(stageOrbSize(820, 1180)).toBe(160)
  })
})

describe('keyboardPadding', () => {
  it('sits on the keyboard when it is up, and above the home indicator when it is down', () => {
    expect(keyboardPadding(0, 34)).toBe(34)
    expect(keyboardPadding(336, 34)).toBe(336)
  })
})
