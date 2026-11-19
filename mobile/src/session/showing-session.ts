import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useFocusEffect } from 'expo-router'

/**
 * Whether a session is the screen showing. A session can live inside the host list's page as well as on its
 * own route, so the route alone doesn't say; each screen showing one holds it while it does.
 */
export function createShowingSessionStore() {
  let holders = 0
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  return {
    read: () => holders > 0,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    show(): () => void {
      holders += 1
      notify()
      let released = false
      return () => {
        if (!released) {
          released = true
          holders -= 1
          notify()
        }
      }
    }
  }
}

const showingSession = createShowingSessionStore()

/** Holds "a session is showing" while this screen is focused and `active`. */
export function useShowsSession(active: boolean): void {
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )
  useEffect(() => (active && focused ? showingSession.show() : undefined), [active, focused])
}

export function useIsShowingSession(): boolean {
  return useSyncExternalStore(showingSession.subscribe, showingSession.read)
}
