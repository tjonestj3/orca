import { describe, expect, it } from 'vitest'
import { mergeJarvisMessages, parseJarvisHistory } from './jarvis-history'

describe('parseJarvisHistory', () => {
  it('reads the server history and skips what it cannot use', () => {
    expect(
      parseJarvisHistory({
        messages: [
          { id: 1, kind: 'reply', text: ' Sending it. ', at: 10 },
          { id: 2, kind: 'update', text: 'main: PR 300 is open.' },
          { id: 3, kind: 'you', text: 'and spell duel?', at: 30 },
          { id: 'x', text: 'no id' },
          { id: 4, text: '' },
          null
        ]
      })
    ).toEqual([
      { id: 1, kind: 'reply', text: 'Sending it.', at: 10 },
      { id: 2, kind: 'update', text: 'main: PR 300 is open.', at: 0 },
      { id: 3, kind: 'you', text: 'and spell duel?', at: 30 }
    ])
    expect(parseJarvisHistory({})).toEqual([])
    expect(parseJarvisHistory(null)).toEqual([])
  })
})

describe('mergeJarvisMessages', () => {
  it('joins fetched and live messages by id, oldest first', () => {
    const a = { id: 1, kind: 'reply' as const, text: 'One', at: 1 }
    const b = { id: 2, kind: 'update' as const, text: 'Two', at: 2 }
    const c = { id: 3, kind: 'reply' as const, text: 'Three', at: 3 }
    expect(mergeJarvisMessages([b, a], [c, b])).toEqual([a, b, c])
  })
})
