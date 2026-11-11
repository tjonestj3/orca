import { useEffect, useMemo, useState } from 'react'

// Something Jarvis said: an answer to you, or an agent's update it read out. Kept by the Jarvis server so
// any of them can be played again, even after the call ended.
export type JarvisMessage = {
  readonly id: number
  readonly kind: 'reply' | 'update'
  readonly text: string
  readonly at: number
}

const MAX_MESSAGES = 40
const POLL_MS = 5000
const FETCH_TIMEOUT_MS = 4000

export function readJarvisMessage(raw: unknown): JarvisMessage | null {
  const entry = raw as Record<string, unknown> | null
  if (
    !entry ||
    typeof entry.id !== 'number' ||
    typeof entry.text !== 'string' ||
    !entry.text.trim()
  ) {
    return null
  }
  return {
    id: entry.id,
    kind: entry.kind === 'update' ? 'update' : 'reply',
    text: entry.text.trim(),
    at: typeof entry.at === 'number' ? entry.at : 0
  }
}

export function parseJarvisHistory(raw: unknown): JarvisMessage[] {
  const list = (raw as { messages?: unknown } | null)?.messages
  if (!Array.isArray(list)) {
    return []
  }
  return list.flatMap((item) => {
    const message = readJarvisMessage(item)
    return message ? [message] : []
  })
}

// One list from the server's history and the messages that arrived live in the call: by id, oldest first.
export function mergeJarvisMessages(
  ...lists: readonly (readonly JarvisMessage[])[]
): JarvisMessage[] {
  const byId = new Map<number, JarvisMessage>()
  for (const list of lists) {
    for (const message of list) {
      byId.set(message.id, message)
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-MAX_MESSAGES)
}

// The server's history, polled while the screen is mounted, joined with what the live call has said.
export function useJarvisHistory(
  url: string | null,
  live: readonly JarvisMessage[]
): JarvisMessage[] {
  const [fetched, setFetched] = useState<JarvisMessage[]>([])
  useEffect(() => {
    if (!url) {
      return
    }
    let stopped = false
    const load = async (): Promise<void> => {
      const abort = new AbortController()
      const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS)
      try {
        const response = await fetch(url, { signal: abort.signal })
        if (response.ok) {
          const body: unknown = await response.json()
          if (!stopped) {
            setFetched(parseJarvisHistory(body))
          }
        }
      } catch {
        // An older Jarvis server without history, or unreachable: the live messages still show.
      } finally {
        clearTimeout(timer)
      }
    }
    void load()
    const interval = setInterval(() => void load(), POLL_MS)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [url])
  return useMemo(() => mergeJarvisMessages(fetched, live), [fetched, live])
}
