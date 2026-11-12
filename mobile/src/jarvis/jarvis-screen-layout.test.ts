import { describe, expect, it } from 'vitest'
import { stageOrbSize } from './jarvis-screen-layout'

describe('stageOrbSize', () => {
  it('leaves the folded Duo room for the worktree list and conversation', () => {
    expect(stageOrbSize(375, 667)).toBeLessThanOrEqual(104)
  })

  it('grows on a big screen, up to a cap', () => {
    expect(stageOrbSize(820, 1180)).toBe(160)
  })
})
