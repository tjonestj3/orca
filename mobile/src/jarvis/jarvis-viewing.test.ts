import { describe, expect, it } from 'vitest'
import { viewingTarget } from './jarvis-viewing'

describe('viewingTarget', () => {
  it("names the worktree open on the Jarvis computer's session screen", () => {
    expect(viewingTarget('/h/host-1/session/repo%3A%3A%2Fwork%2Fa', 'host-1')).toBe('repo::/work/a')
    expect(viewingTarget('/h/host-1/session/repo::/work/a', 'host-1')).toBe('repo::/work/a')
    expect(viewingTarget('/h/host-1/session/global-floating-terminal', 'host-1')).toBe(
      'global-floating-terminal'
    )
  })

  it('names nothing on another computer, another screen, or before Jarvis has a computer', () => {
    expect(viewingTarget('/h/host-2/session/repo%3A%3A%2Fwork%2Fa', 'host-1')).toBeNull()
    expect(viewingTarget('/h/host-1/jarvis', 'host-1')).toBeNull()
    expect(viewingTarget('/h/host-1/session/repo%3A%3A%2Fwork%2Fa', null)).toBeNull()
  })
})
