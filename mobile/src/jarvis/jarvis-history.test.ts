import { describe, expect, it } from 'vitest'
import {
  historyPollMs,
  historyPollUrl,
  mergeJarvisMessages,
  parseJarvisHistory,
  readJarvisMessage,
  settledMessages,
  takeArtifactsToOpen,
  type JarvisMessage
} from './jarvis-history'

const message = (fields: Partial<JarvisMessage> & Pick<JarvisMessage, 'id'>): JarvisMessage => ({
  kind: 'reply',
  text: 'x',
  at: 0,
  via: null,
  done: true,
  rev: 0,
  ...fields
})

describe('parseJarvisHistory', () => {
  it('reads an older server: no revisions, nothing in progress', () => {
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
    ).toEqual({
      messages: [
        message({ id: 1, kind: 'reply', text: 'Sending it.', at: 10 }),
        message({ id: 2, kind: 'update', text: 'main: PR 300 is open.' }),
        message({ id: 3, kind: 'you', text: 'and spell duel?', at: 30 })
      ],
      rev: 0,
      working: false
    })
    expect(parseJarvisHistory({})).toEqual({ messages: [], rev: 0, working: false })
    expect(parseJarvisHistory(null)).toEqual({ messages: [], rev: 0, working: false })
  })

  it('reads the chat: how each line came, tools, dividers, replies still being written', () => {
    const parsed = parseJarvisHistory({
      messages: [
        { id: 5, kind: 'you', text: 'status?\n- quick', via: 'typed', done: true, rev: 7 },
        { id: 6, kind: 'tool', text: 'Orca overview', via: 'typed', done: true, rev: 8 },
        { id: 7, kind: 'reply', text: 'Two agents:\n- auth', via: 'typed', done: false, rev: 9 },
        { id: 8, kind: 'new', text: 'New conversation', rev: 10 },
        { id: 9, kind: 'reply', text: 'Hm', via: 'satellite', rev: 11 }
      ],
      rev: 11,
      working: true
    })
    expect(parsed.rev).toBe(11)
    expect(parsed.working).toBe(true)
    expect(parsed.messages.map((m) => [m.kind, m.via, m.done])).toEqual([
      ['you', 'typed', true],
      ['tool', 'typed', true],
      ['reply', 'typed', false],
      ['new', null, true],
      ['reply', null, true]
    ])
    expect(parsed.messages[0].text).toBe('status?\n- quick')
  })

  it('keeps an empty reply that is still being written', () => {
    const { messages } = parseJarvisHistory({
      messages: [{ id: 3, kind: 'reply', text: '', done: false, rev: 4 }]
    })
    expect(messages).toEqual([message({ id: 3, text: '', done: false, rev: 4 })])
  })
})

describe('mergeJarvisMessages', () => {
  it('joins fetched and live messages by id, oldest first', () => {
    const a = message({ id: 1, text: 'One' })
    const b = message({ id: 2, kind: 'update', text: 'Two' })
    const c = message({ id: 3, text: 'Three' })
    expect(mergeJarvisMessages([b, a], [c, b])).toEqual([a, b, c])
  })

  it('a reply that grew replaces its earlier text, whichever list has it', () => {
    const early = message({ id: 4, text: 'Two', done: false, rev: 5 })
    const later = message({ id: 4, text: 'Two agents are working.', done: true, rev: 9 })
    expect(mergeJarvisMessages([later], [early])).toEqual([later])
    expect(mergeJarvisMessages([early], [later])).toEqual([later])
  })
})

describe('polling the history', () => {
  it('asks only for what changed since the last revision seen', () => {
    expect(historyPollUrl('http://h:7860/api/jarvis/history', 0)).toBe(
      'http://h:7860/api/jarvis/history?since=0'
    )
    expect(historyPollUrl('http://h:7860/api/jarvis/history', 42)).toBe(
      'http://h:7860/api/jarvis/history?since=42'
    )
  })

  it('looks often while Xeno is answering or just after a send, and rarely otherwise', () => {
    expect(historyPollMs({ working: true, quickUntil: 0, now: 1000 })).toBe(400)
    expect(historyPollMs({ working: false, quickUntil: 5000, now: 1000 })).toBe(400)
    expect(historyPollMs({ working: false, quickUntil: 500, now: 1000 })).toBe(5000)
  })
})

describe('settledMessages', () => {
  it('drops replies left "being written" once Xeno is no longer answering', () => {
    const kept = message({ id: 1, text: 'Done.', rev: 3 })
    const dropped = message({ id: 2, text: 'So', done: false, rev: 4 })
    expect(settledMessages([kept, dropped], false)).toEqual([kept])
    expect(settledMessages([kept, dropped], true)).toEqual([kept, dropped])
  })
})

describe('artifacts Xeno opened from typed chat', () => {
  const url = 'https://claude.ai/artifact/VjFHgpyKnqH5fcXKHKHbNj'
  const now = 1_795_041_500_000
  const line = (id: number, extra: Record<string, unknown> = {}) =>
    readJarvisMessage({
      id,
      kind: 'tool',
      text: 'Opened Control layouts',
      at: now - 2000,
      via: 'typed',
      done: true,
      rev: id,
      open: { url, title: 'Control layouts' },
      ...extra
    })!

  it('reads the link a tool line carries, and only a Claude artifact link', () => {
    expect(line(1).open).toEqual({ url, title: 'Control layouts' })
    expect(line(2, { open: { url: 'https://evil.example/x' } }).open).toBeUndefined()
    expect(line(3, { open: undefined }).open).toBeUndefined()
  })

  it('opens each one once, as it arrives', () => {
    const seen = new Set<number>()
    expect(takeArtifactsToOpen([line(1)], { seen, firstLoad: false, now })).toEqual([url])
    expect(takeArtifactsToOpen([line(1)], { seen, firstLoad: false, now })).toEqual([])
  })

  it('never reopens old ones when the conversation first loads, or long after', () => {
    const seen = new Set<number>()
    expect(takeArtifactsToOpen([line(1)], { seen, firstLoad: true, now })).toEqual([])
    expect(takeArtifactsToOpen([line(1)], { seen, firstLoad: false, now })).toEqual([])
    const stale = line(2, { at: now - 10 * 60_000 })
    expect(takeArtifactsToOpen([stale], { seen: new Set(), firstLoad: false, now })).toEqual([])
  })

  it('leaves a call to open its own, through the call', () => {
    const spoken = line(1, { via: 'voice' })
    expect(takeArtifactsToOpen([spoken], { seen: new Set(), firstLoad: false, now })).toEqual([])
  })
})

describe('images on messages', () => {
  const id = 'ab'.repeat(16)

  it('keeps the ids of images typed with a message, and a message that is only images', () => {
    const message = readJarvisMessage({ id: 1, kind: 'you', text: '', images: [id], via: 'typed' })
    expect(message?.images).toEqual([id])
    expect(message?.text).toBe('')
  })

  it('drops anything that is not an image id', () => {
    const message = readJarvisMessage({ id: 1, kind: 'you', text: 'look', images: [id, '../x', 7] })
    expect(message?.images).toEqual([id])
    expect(readJarvisMessage({ id: 2, kind: 'you', text: 'hi' })).not.toHaveProperty('images')
  })

  it('still drops an empty message with no images', () => {
    expect(readJarvisMessage({ id: 3, kind: 'you', text: '', images: ['nope'] })).toBeNull()
  })
})
