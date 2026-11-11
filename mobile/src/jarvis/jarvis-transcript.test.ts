import { describe, expect, it } from 'vitest'
import type { JarvisMessage } from './jarvis-history'
import { transcriptEntries, TRANSCRIPT_TIME_GAP_MS } from './jarvis-transcript'

const at = 1_800_000_000_000
const you = (id: number, text: string, t = at): JarvisMessage => ({ id, kind: 'you', text, at: t })
const reply = (id: number, text: string, t = at): JarvisMessage => ({
  id,
  kind: 'reply',
  text,
  at: t
})
const update = (id: number, text: string, t = at): JarvisMessage => ({
  id,
  kind: 'update',
  text,
  at: t
})

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
})
