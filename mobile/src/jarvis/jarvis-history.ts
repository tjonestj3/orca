import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readArtifact, type JarvisArtifact } from './jarvis-artifacts'
import { xenoFetch } from './jarvis-key'

// A line of the conversation, kept by the Jarvis server: what you said, typed or tapped, Xeno's answer, an
// agent's update it read out, a tool it used, or the start of a new conversation. Xeno's own lines can be played
// again, even after the call ended. A reply still being written has done false and grows; rev orders changes.
export type JarvisMessage = {
  readonly id: number
  readonly kind: 'you' | 'reply' | 'update' | 'tool' | 'new'
  readonly text: string
  readonly at: number
  readonly via: 'voice' | 'typed' | 'tap' | null
  readonly done: boolean
  readonly rev: number
  // A typed open_artifact's line carries the artifact, for the app to open as it arrives (a call opens its own).
  readonly open?: JarvisArtifact | null
}

export type JarvisHistory = {
  readonly messages: JarvisMessage[]
  readonly rev: number
  readonly working: boolean
}

const MAX_MESSAGES = 300
const POLL_MS = 5000
// While Xeno is answering (or just after a send), so a reply shows as it's written.
const QUICK_POLL_MS = 400
const FETCH_TIMEOUT_MS = 4000
const KINDS = new Set<JarvisMessage['kind']>(['you', 'reply', 'update', 'tool', 'new'])
const VIAS = new Set<NonNullable<JarvisMessage['via']>>(['voice', 'typed', 'tap'])

export function readJarvisMessage(raw: unknown): JarvisMessage | null {
  const entry = raw as Record<string, unknown> | null
  if (!entry || typeof entry.id !== 'number' || typeof entry.text !== 'string') {
    return null
  }
  const done = entry.done !== false
  const text = entry.text.trim()
  // An empty line is only kept while it's a reply still being written.
  if (!text && done) {
    return null
  }
  const kind = KINDS.has(entry.kind as JarvisMessage['kind'])
    ? (entry.kind as JarvisMessage['kind'])
    : 'reply'
  const via = VIAS.has(entry.via as NonNullable<JarvisMessage['via']>)
    ? (entry.via as JarvisMessage['via'])
    : null
  const open = kind === 'tool' ? readArtifact(entry.open) : null
  return {
    id: entry.id,
    kind,
    text,
    at: typeof entry.at === 'number' ? entry.at : 0,
    via,
    done,
    rev: typeof entry.rev === 'number' ? entry.rev : 0,
    ...(open ? { open } : {})
  }
}

// How long after Xeno opened an artifact the app still opens it: a screen that comes back later doesn't.
const OPEN_WITHIN_MS = 2 * 60_000

// The artifacts typed chat asked to open that just arrived, each once (`seen` remembers them). Nothing on the
// first load, so opening the conversation never replays old ones.
export function takeArtifactsToOpen(
  messages: readonly JarvisMessage[],
  at: { readonly seen: Set<number>; readonly firstLoad: boolean; readonly now: number }
): string[] {
  const urls: string[] = []
  for (const message of messages) {
    if (message.kind !== 'tool' || message.via !== 'typed' || !message.open) {
      continue
    }
    if (at.seen.has(message.id)) {
      continue
    }
    at.seen.add(message.id)
    if (!at.firstLoad && at.now - message.at < OPEN_WITHIN_MS) {
      urls.push(message.open.url)
    }
  }
  return urls
}

export function parseJarvisHistory(raw: unknown): JarvisHistory {
  const body = raw as { messages?: unknown; rev?: unknown; working?: unknown } | null
  const list = Array.isArray(body?.messages) ? body.messages : []
  return {
    messages: list.flatMap((item) => {
      const message = readJarvisMessage(item)
      return message ? [message] : []
    }),
    rev: typeof body?.rev === 'number' ? body.rev : 0,
    working: body?.working === true
  }
}

// One list from the server's history and the messages that arrived live in the call: by id, oldest first. For
// the same id the latest revision wins (a reply that grew); on a tie, the later list.
export function mergeJarvisMessages(
  ...lists: readonly (readonly JarvisMessage[])[]
): JarvisMessage[] {
  const byId = new Map<number, JarvisMessage>()
  for (const list of lists) {
    for (const message of list) {
      const known = byId.get(message.id)
      if (!known || message.rev >= known.rev) {
        byId.set(message.id, message)
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-MAX_MESSAGES)
}

// Outside a turn nothing is being written: a reply still marked so was dropped on the server (talked over before
// a word of it played), and polls only report changes, so it would otherwise linger here.
export function settledMessages(
  messages: readonly JarvisMessage[],
  working: boolean
): JarvisMessage[] {
  return working ? [...messages] : messages.filter((m) => m.done)
}

export function historyPollUrl(url: string, since: number): string {
  return `${url}?since=${since}`
}

export function historyPollMs(at: {
  readonly working: boolean
  readonly quickUntil: number
  readonly now: number
}): number {
  return at.working || at.now < at.quickUntil ? QUICK_POLL_MS : POLL_MS
}

export type JarvisHistoryView = {
  readonly messages: JarvisMessage[]
  // Xeno is answering a turn right now, spoken or typed.
  readonly working: boolean
  // Look again now, and often for a few seconds: after sending, so the answer shows as it's written.
  readonly refresh: () => void
}

const QUICK_AFTER_SEND_MS = 3000
// Lines whose artifact was opened or passed over, across screens and remounts.
const seenArtifactLines = new Set<number>()

// The server's history, polled while the screen is mounted for just what changed, joined with what the live call
// has said. onOpenArtifact: the typed chat's, for artifacts Xeno opens from it.
export function useJarvisHistory(
  url: string | null,
  live: readonly JarvisMessage[],
  onOpenArtifact?: (url: string) => void
): JarvisHistoryView {
  const openArtifact = useRef(onOpenArtifact)
  openArtifact.current = onOpenArtifact
  const [fetched, setFetched] = useState<JarvisMessage[]>([])
  const [working, setWorking] = useState(false)
  const kick = useRef<() => void>(() => undefined)
  useEffect(() => {
    if (!url) {
      return
    }
    let stopped = false
    let rev = 0
    let busy = false
    let quickUntil = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = (ms: number): void => {
      if (timer) {
        clearTimeout(timer)
      }
      if (!stopped) {
        timer = setTimeout(() => void load(), ms)
      }
    }
    const load = async (): Promise<void> => {
      if (busy) {
        return
      }
      busy = true
      let isWorking = false
      const abort = new AbortController()
      const timeout = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS)
      try {
        const response = await xenoFetch(historyPollUrl(url, rev), { signal: abort.signal })
        if (response.ok && !stopped) {
          const body = parseJarvisHistory(await response.json())
          if (openArtifact.current) {
            const firstLoad = rev === 0 || body.rev < rev
            for (const link of takeArtifactsToOpen(body.messages, {
              seen: seenArtifactLines,
              firstLoad,
              now: Date.now()
            })) {
              openArtifact.current(link)
            }
          }
          if (body.rev < rev) {
            // The server restarted and counts revisions afresh: take everything again.
            rev = 0
            setFetched(body.messages)
          } else {
            rev = body.rev
            setFetched((known) =>
              settledMessages(mergeJarvisMessages(known, body.messages), body.working)
            )
          }
          isWorking = body.working
          setWorking(body.working)
        }
      } catch {
        // Unreachable for now, or an older server: the live messages still show.
      } finally {
        clearTimeout(timeout)
        busy = false
      }
      schedule(historyPollMs({ working: isWorking, quickUntil, now: Date.now() }))
    }
    kick.current = () => {
      quickUntil = Date.now() + QUICK_AFTER_SEND_MS
      schedule(0)
    }
    void load()
    return () => {
      stopped = true
      if (timer) {
        clearTimeout(timer)
      }
      kick.current = () => undefined
    }
  }, [url])
  const messages = useMemo(() => mergeJarvisMessages(fetched, live), [fetched, live])
  const refresh = useCallback(() => kick.current(), [])
  return { messages, working, refresh }
}
