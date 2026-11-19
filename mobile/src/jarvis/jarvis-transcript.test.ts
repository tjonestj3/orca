import { describe, expect, it } from 'vitest'
import type { JarvisMessage } from './jarvis-history'
import {
  animatesIn,
  showJumpToLatest,
  transcriptEntries,
  transcriptListItems,
  TRANSCRIPT_TIME_GAP_MS
} from './jarvis-transcript'

const at = 1_800_000_000_000
const line = (
  id: number,
  kind: JarvisMessage['kind'],
  text: string,
  t = at,
  extra: Partial<JarvisMessage> = {}
): JarvisMessage => ({ id, kind, text, at: t, via: null, done: true, rev: id, ...extra })
const you = (id: number, text: string, t = at): JarvisMessage => line(id, 'you', text, t)
const reply = (id: number, text: string, t = at): JarvisMessage => line(id, 'reply', text, t)
const update = (id: number, text: string, t = at): JarvisMessage => line(id, 'update', text, t)

describe('transcriptEntries', () => {
  it('reads as the conversation went, with your words on your side', () => {
    const entries = transcriptEntries(
      [reply(2, 'Auth is done.'), you(1, 'status?'), update(3, 'main: PR open.')],
      ''
    )
    expect(entries.map((e) => [e.who, e.text, e.playable])).toEqual([
      ['you', 'status?', false],
      ['jarvis', 'Auth is done.', true],
      ['update', 'main: PR open.', true]
    ])
  })

  it('shows the time where the conversation starts and where it picks up after a pause', () => {
    const entries = transcriptEntries(
      [
        you(1, 'hi', at),
        reply(2, 'Hello.', at + 60_000),
        you(3, 'back', at + TRANSCRIPT_TIME_GAP_MS + 60_000)
      ],
      ''
    )
    expect(entries.map((e) => e.showTime)).toEqual([true, false, true])
  })

  it('ends with what Jarvis is hearing now, until the server keeps it', () => {
    const live = transcriptEntries(
      [you(1, 'status?'), reply(2, 'Auth is done.')],
      'and spell duel?'
    )
    expect(live.at(-1)).toMatchObject({
      who: 'you',
      text: 'and spell duel?',
      pending: true,
      playable: false
    })
    const kept = transcriptEntries([you(1, 'and spell duel?')], 'and spell duel?')
    expect(kept.filter((e) => e.pending)).toEqual([])
  })

  it('marks what was said aloud, typed replies as formatted, and replies still being written', () => {
    const entries = transcriptEntries(
      [
        line(1, 'you', 'status?', at, { via: 'voice' }),
        line(2, 'you', 'and tetris?\n- quick', at, { via: 'typed' }),
        line(3, 'tool', 'Looked at tetris', at, { via: 'typed' }),
        line(4, 'reply', '**Tetris** is building', at, { via: 'typed', done: false }),
        line(5, 'reply', 'Auth is done.', at, { via: 'voice' })
      ],
      ''
    )
    expect(entries.map((e) => [e.who, e.spoken, e.markdown, e.growing, e.playable])).toEqual([
      ['you', true, false, false, false],
      ['you', false, false, false, false],
      ['tool', false, false, false, false],
      ['jarvis', false, true, true, false],
      ['jarvis', false, false, false, true]
    ])
  })

  it('shows a new conversation as a divider that is never played', () => {
    const entries = transcriptEntries([reply(1, 'Done.'), line(2, 'new', 'New conversation')], '')
    expect(entries.at(-1)).toMatchObject({ who: 'new', playable: false })
  })
})

describe('transcriptListItems', () => {
  const entries = transcriptEntries([you(1, 'status?'), reply(2, 'Auth is done.')], '')

  it('puts the newest first, for a list drawn from the bottom up', () => {
    expect(transcriptListItems(entries, false).map((item) => item.key)).toEqual(['2', '1'])
  })

  it('shows Xeno working as the newest item until its reply starts to appear', () => {
    expect(transcriptListItems(entries, true).map((item) => item.key)).toEqual([
      'working',
      '2',
      '1'
    ])
    const writing = transcriptEntries(
      [you(1, 'status?'), line(2, 'reply', 'Auth', at, { done: false })],
      ''
    )
    expect(transcriptListItems(writing, true).map((item) => item.key)).toEqual(['2', '1'])
  })
})

describe('showJumpToLatest', () => {
  it('shows once the reader is more than half a screen above the newest line', () => {
    expect(showJumpToLatest(0, 800)).toBe(false)
    expect(showJumpToLatest(400, 800)).toBe(false)
    expect(showJumpToLatest(401, 800)).toBe(true)
  })
})

describe('animatesIn', () => {
  it('never animates what was there when the conversation opened', () => {
    expect(animatesIn('5', null)).toBe(false)
  })

  it('animates a line that arrives later, once', () => {
    const seen = new Set(['1', '2'])
    expect(animatesIn('3', seen)).toBe(true)
    expect(animatesIn('2', seen)).toBe(false)
  })
})

describe('images in the transcript', () => {
  it('carries the images typed with your message', () => {
    const id = 'cd'.repeat(16)
    const [entry] = transcriptEntries([line(1, 'you', '', at, { images: [id], via: 'typed' })], '')
    expect(entry.images).toEqual([id])
    expect(transcriptEntries([you(2, 'hi')], '')[0].images).toEqual([])
  })
})
