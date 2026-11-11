import { describe, expect, it } from 'vitest'
import { parseJarvisWorktrees } from './jarvis-worktrees'

describe('parseJarvisWorktrees', () => {
  it('keeps well-formed worktrees and treats an unknown state as idle', () => {
    const parsed = parseJarvisWorktrees({
      worktrees: [
        { id: 'r::a', name: 'reactions-doc', repo: 'spell-duel', state: 'needs you', status: '' },
        { id: 'r::b', name: 'main', repo: 'SDI', state: 'sleeping', status: 'Running tests' },
        { name: 'no id' },
        'junk'
      ]
    })
    expect(parsed).toEqual([
      { id: 'r::a', name: 'reactions-doc', repo: 'spell-duel', state: 'needs you', status: null },
      { id: 'r::b', name: 'main', repo: 'SDI', state: 'idle', status: 'Running tests' }
    ])
  })

  it('has nothing for a body that is not a list', () => {
    expect(parseJarvisWorktrees({ error: 'down' })).toEqual([])
    expect(parseJarvisWorktrees(null)).toEqual([])
  })
})
