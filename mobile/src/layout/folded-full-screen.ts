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

/**
 * The side screens extend over: the status column's, while a session screen asks and full screen is
 * on. Only the Duo's cover screen has one; how big iOS says the window is doesn't decide it.
 */
export function extendedColumnSide<Side extends string>(s: {
  requested: boolean
  fullScreen: boolean
  column: { side: Side } | null
}): Side | null {
  return s.requested && s.fullScreen && s.column ? s.column.side : null
}

/** A header's padding over the column while screens extend over it, so it keeps clear of the camera like Moshi's. */
export function columnClearance(
  column: { side: 'left' | 'right'; width: number; extended: boolean } | null
): { paddingRight: number } | { paddingLeft: number } | null {
  if (!column?.extended) {
    return null
  }
  return column.side === 'right' ? { paddingRight: column.width } : { paddingLeft: column.width }
}

type Side = 'left' | 'right'
type Column = { side: Side; width: number; extended: boolean }
type Insets = { top: number; right: number; bottom: number; left: number }
type Rect = { x: number; y: number; width: number; height: number }

/**
 * How far down the folded Duo's status column a page extending over it keeps its header clear: past the camera,
 * which reaches 66 pt. The header pads itself out of the column for its whole height, so it keeps its own height
 * (96 pt with tabs) and the page loses no room to full screen.
 */
export const COLUMN_HEADER_BAND = 67
/** The column's own toggle: just under the camera, beside the header, inside its height. */
export const COLUMN_TOGGLE_TOP = COLUMN_HEADER_BAND
export const COLUMN_TOGGLE_BUTTON = 28 // NavBarButton's compact size
/** A nav bar button and the gap below it, where the toggle heads the rail. */
export const COLUMN_TOGGLE_SLOT = 44

/**
 * Where the column's own full-screen toggle goes, for a screen whose header the app doesn't draw (a
 * session is the desktop's page): under the camera while extended over, else heading the rail.
 */
export function columnToggleSlot(s: {
  wanted: boolean
  column: Column | null
  strip: { side: Side; width: number; top: number; height: number } | null
}): { side: Side; width: number; top: number } | null {
  if (!s.wanted || !s.column) {
    return null
  }
  if (s.column.extended) {
    return { side: s.column.side, width: s.column.width, top: COLUMN_TOGGLE_TOP }
  }
  if (!s.strip || s.strip.height < COLUMN_TOGGLE_SLOT * 2) {
    return null
  }
  return { side: s.strip.side, width: s.strip.width, top: s.strip.top }
}

/**
 * What a page extending over the column is told, in window points: no inset on that side, so it lays
 * out full width with its keys in the bottom row, and the column's top as a cutout. A session's header
 * pads itself out of a cutout that tall, which keeps it clear of the camera and the toggle. Other pages'
 * headers (the host list's) only keep below the top inset, so `raiseTop` false leaves it as it is rather
 * than push them down the camera's height; the shell clears their header's right instead (jarvis/page-anchors).
 */
export function pageOverColumn(s: {
  insets: Insets
  occlusions: readonly Rect[]
  column: Column | null
  windowWidth: number
  raiseTop?: boolean
}): { insets: Insets; occlusions: readonly Rect[] } {
  if (!s.column?.extended) {
    return { insets: s.insets, occlusions: s.occlusions }
  }
  const { side, width } = s.column
  const top = s.raiseTop === false ? s.insets.top : Math.max(s.insets.top, COLUMN_HEADER_BAND)
  return {
    insets: { ...s.insets, [side]: 0, top },
    occlusions: [
      ...s.occlusions,
      { x: side === 'right' ? s.windowWidth - width : 0, y: 0, width, height: COLUMN_HEADER_BAND }
    ]
  }
}
