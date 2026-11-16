import { describe, expect, it } from 'vitest'
import type { JarvisMessage } from './jarvis-history'
import { transcriptEntries, TRANSCRIPT_TIME_GAP_MS } from './jarvis-transcript'

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
