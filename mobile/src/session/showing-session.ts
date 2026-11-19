import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useFocusEffect } from 'expo-router'

export type SessionView = 'chat' | 'terminal'

/**
 * Which session view is the screen showing, if any. A session can live inside the host list's page as well as
 * on its own route, so the route alone doesn't say; each screen showing one holds it while it does.
 */
export function createShowingSessionStore() {
  let holders: { view: SessionView }[] = []
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  return {
    read: (): SessionView | null => holders.at(-1)?.view ?? null,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    show(view: SessionView): () => void {
      const holder = { view }
      holders = [...holders, holder]
      notify()
      return () => {
        if (holders.includes(holder)) {
          holders = holders.filter((held) => held !== holder)
          notify()
        }
      }
    }
  }
}

const showingSession = createShowingSessionStore()

/** Holds which session view shows while this screen is focused and shows one (`view` null: none). */
export function useShowsSession(view: SessionView | null): void {
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )
  useEffect(() => (view && focused ? showingSession.show(view) : undefined), [view, focused])
}

export function useShowingSession(): SessionView | null {
  return useSyncExternalStore(showingSession.subscribe, showingSession.read)
}
