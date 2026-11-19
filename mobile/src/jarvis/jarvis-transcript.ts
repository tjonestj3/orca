import type { JarvisMessage } from './jarvis-history'

// A time shows where the conversation starts and wherever it picks up after a pause this long.
export const TRANSCRIPT_TIME_GAP_MS = 10 * 60 * 1000

export type TranscriptEntry = {
  readonly key: string
  // The server's id, to play Jarvis's lines again; null for words still being heard.
  readonly id: number | null
  readonly who: 'you' | 'jarvis' | 'update' | 'tool' | 'new'
  readonly text: string
  readonly at: number
  readonly showTime: boolean
  readonly playable: boolean
  readonly pending: boolean
  // Your words that were said aloud (shown with a mic), not typed or tapped.
  readonly spoken: boolean
  // A reply still being written: it grows as the poll brings more.
  readonly growing: boolean
  // A typed reply, written for the screen: rendered as markdown.
  readonly markdown: boolean
}

function who(kind: JarvisMessage['kind']): TranscriptEntry['who'] {
  return kind === 'reply' ? 'jarvis' : kind
}

// The conversation as it went, oldest first, ending with what Jarvis is hearing now until the server keeps it.
export function transcriptEntries(
  messages: readonly JarvisMessage[],
  hearing: string
): TranscriptEntry[] {
  const sorted = [...messages].sort((a, b) => a.id - b.id)
  let lastAt = 0
  const entries = sorted.map((message): TranscriptEntry => {
    const showTime =
      message.at > 0 && (lastAt === 0 || message.at - lastAt >= TRANSCRIPT_TIME_GAP_MS)
    if (message.at > 0) {
      lastAt = message.at
    }
    return {
      key: String(message.id),
      id: message.id,
      who: who(message.kind),
      text: message.text,
      at: message.at,
      showTime,
      playable: (message.kind === 'reply' || message.kind === 'update') && message.done,
      pending: false,
      spoken: message.kind === 'you' && message.via === 'voice',
      growing: !message.done,
      markdown: message.kind === 'reply' && message.via === 'typed'
    }
  })
  const heard = hearing.trim()
  const lastYours = sorted.findLast((m) => m.kind === 'you')
  if (heard && lastYours?.text !== heard) {
    entries.push({
      key: 'hearing',
      id: null,
      who: 'you',
      text: heard,
      at: 0,
      showTime: false,
      playable: false,
      pending: true,
      spoken: true,
      growing: false,
      markdown: false
    })
  }
  return entries
}

// The transcript as a list drawn from the bottom up (an inverted list): newest first, with "Xeno is working…"
// as the newest item until its reply starts to appear.
export type TranscriptListItem =
  | { readonly kind: 'entry'; readonly key: string; readonly entry: TranscriptEntry }
  | { readonly kind: 'working'; readonly key: 'working' }

export function transcriptListItems(
  entries: readonly TranscriptEntry[],
  working: boolean
): TranscriptListItem[] {
  const items: TranscriptListItem[] = entries
    .map((entry): TranscriptListItem => ({ kind: 'entry', key: entry.key, entry }))
    .toReversed()
  const writing = entries.at(-1)?.growing === true
  return working && !writing ? [{ kind: 'working', key: 'working' }, ...items] : items
}

// The "jump to latest" button: once the reader is more than half a screen above the newest line. In an inverted
// list the scroll offset is the distance from the bottom.
export function showJumpToLatest(offsetY: number, viewHeight: number): boolean {
  return offsetY > viewHeight / 2
}

// Lines slide in as they arrive, but never the ones there when the conversation opened (`seen` is null until the
// first lines load), and never again when the list redraws one scrolled back into view.
export function animatesIn(key: string, seen: ReadonlySet<string> | null): boolean {
  return seen !== null && !seen.has(key)
}
