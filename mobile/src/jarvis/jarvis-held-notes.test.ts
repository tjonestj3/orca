import { describe, expect, it } from 'vitest'
import { HeldNotes } from './jarvis-held-notes'

describe('device notes from before a call connects', () => {
  it('are kept until the call can send them, then given once, in order', () => {
    const held = new HeldNotes()
    held.keep({ kind: 'talk-press', at: 1000 })
    held.keep({ kind: 'music', at: 1500 })
    expect(held.take(2000).map((n) => n.kind)).toEqual(['talk-press', 'music'])
    expect(held.take(2000)).toEqual([])
  })

  it('drop what is too old to explain the call, and keep only the last few', () => {
    const held = new HeldNotes()
    held.keep({ kind: 'stale', at: 0 })
    for (let i = 0; i < 12; i++) {
      held.keep({ kind: `n${i}`, at: 200_000 })
    }
    const taken = held.take(200_000).map((n) => n.kind)
    expect(taken).not.toContain('stale')
    expect(taken).toHaveLength(8)
    expect(taken.at(-1)).toBe('n11')
  })
})
