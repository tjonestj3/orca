import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'orca.folded-full-screen'

type Storage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

/**
 * Whether session screens on the folded iPhone Duo take its status column, like Moshi, with the
 * terminal keys moved to the bottom row. Settings holds the default; the session header's button
 * flips it for now, until the app restarts or Settings changes the default.
 */
export function createFoldedFullScreenStore(storage: Storage) {
  let saved = false
  let flipped: boolean | null = null
  let loading: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    read: () => flipped ?? saved,
    readDefault: () => saved,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load(): Promise<void> {
      loading ??= storage
        .getItem(STORAGE_KEY)
        .then((value) => {
          const on = value === 'true'
          if (value !== null && on !== saved) {
            saved = on
            notify()
          }
        })
        .catch(() => {})
      return loading
    },
    toggle(): void {
      flipped = !(flipped ?? saved)
      notify()
    },
    async setDefault(on: boolean): Promise<void> {
      saved = on
      flipped = null
      notify()
      await storage.setItem(STORAGE_KEY, String(on)).catch(() => {})
    }
  }
}

export const foldedFullScreen = createFoldedFullScreenStore(AsyncStorage)

export function useFoldedFullScreen(): boolean {
  return useSyncExternalStore(foldedFullScreen.subscribe, foldedFullScreen.read)
}

export function useFoldedFullScreenDefault(): boolean {
  return useSyncExternalStore(foldedFullScreen.subscribe, foldedFullScreen.readDefault)
}

/** The side screens extend over: the status column's, while a session screen asks and it applies. */
export function extendedColumnSide<Side extends string>(s: {
  requested: boolean
  fullScreen: boolean
  folded: boolean
  column: { side: Side } | null
}): Side | null {
  return s.requested && s.fullScreen && s.folded && s.column ? s.column.side : null
}
