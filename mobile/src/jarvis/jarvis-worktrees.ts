import { useEffect, useState } from 'react'

// The active worktrees as Jarvis sees them, for the list on the Jarvis screen.
export type JarvisWorktreeState = 'needs you' | 'working' | 'done' | 'idle'

export type JarvisWorktree = {
  readonly id: string
  readonly name: string
  readonly repo: string
  readonly state: JarvisWorktreeState
  readonly status: string | null
}

const STATES: readonly JarvisWorktreeState[] = ['needs you', 'working', 'done', 'idle']
const POLL_MS = 5000
const FETCH_TIMEOUT_MS = 4000

export function parseJarvisWorktrees(raw: unknown): JarvisWorktree[] {
  const list = (raw as { worktrees?: unknown } | null)?.worktrees
  if (!Array.isArray(list)) {
    return []
  }
  return list.flatMap((item): JarvisWorktree[] => {
    const entry = item as Record<string, unknown> | null
    if (!entry || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string') {
      return []
    }
    const state = STATES.find((known) => known === entry.state) ?? 'idle'
    return [
      {
        id: entry.id,
        name: entry.name,
        repo: typeof entry.repo === 'string' ? entry.repo : '',
        state,
        status: typeof entry.status === 'string' && entry.status ? entry.status : null
      }
    ]
  })
}

// Polls while the screen is mounted; null until the first answer, false when the desktop can't be reached.
export function useJarvisWorktrees(url: string | null): {
  worktrees: JarvisWorktree[]
  reachable: boolean | null
} {
  const [worktrees, setWorktrees] = useState<JarvisWorktree[]>([])
  const [reachable, setReachable] = useState<boolean | null>(null)
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
        const body: unknown = await response.json()
        if (!stopped) {
          setWorktrees(parseJarvisWorktrees(body))
          setReachable(response.ok)
        }
      } catch {
        if (!stopped) {
          setReachable(false)
        }
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
  return { worktrees, reachable }
}
