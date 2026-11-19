import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReservedRegions } from './reserved-regions'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import {
  getSideRailStrip,
  hasTerminalDirectionPadSpace,
  sideRailStripAboveKeyboard,
  type SideRailStrip
} from './side-rail-strip'
import { createRailStore } from './side-rail-store'
import {
  COLUMN_TOGGLE_SLOT,
  columnToggleSlot,
  extendedColumnSide,
  foldedFullScreen,
  useFoldedFullScreen
} from './folded-full-screen'
import { ColumnToggle } from './column-toggle'

type RailStore = ReturnType<typeof createRailStore>

/** The device's status column, whether screens draw in it or extend over it. */
export type SideColumn = {
  side: SideRailStrip['side']
  width: number
  extended: boolean
}

const SideRailContext = createContext<{
  strip: SideRailStrip | null
  directionPadAvailable: boolean
  store: RailStore
  column: SideColumn | null
  /** Each screen asking to extend over the column holds one; returns its release. */
  requestFullScreen: (options: FullScreenOptions) => () => void
} | null>(null)

type FullScreenOptions = {
  /** The screen's header isn't the app's (a session is the desktop's page), so the column holds its toggle. */
  columnToggle?: boolean
}

/**
 * The status column's side and width once seen. iOS stops reporting it while the status bar is hidden
 * and as the app comes back from the background, so the last one seen stands for it.
 */
function useRememberedColumn(strip: SideRailStrip | null) {
  const [seen, setSeen] = useState<Pick<SideRailStrip, 'side' | 'width'> | null>(null)
  useEffect(() => {
    if (strip && (strip.side !== seen?.side || strip.width !== seen.width)) {
      setSeen({ side: strip.side, width: strip.width })
    }
  }, [strip, seen])
  return strip ?? seen
}

function useFullScreenRequests() {
  const [counts, setCounts] = useState({ all: 0, toggle: 0 })
  const request = useMemo(
    () => (options: FullScreenOptions) => {
      const toggle = options.columnToggle ? 1 : 0
      setCounts((n) => ({ all: n.all + 1, toggle: n.toggle + toggle }))
      let released = false
      return () => {
        if (!released) {
          released = true
          setCounts((n) => ({ all: n.all - 1, toggle: n.toggle - toggle }))
        }
      }
    },
    []
  )
  return [counts.all > 0, counts.toggle > 0, request] as const
}

/**
 * Lets one screen draw controls in a side inset strip the screens are laid out clear of, such as
 * the iPhone Duo's status column. Sits outside `SideSafeArea`, which pads every screen out of it.
 */
export function SideRailProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createRailStore)
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { occlusions, hasFoldDivision } = useReservedRegions()
  // Landscape, the keyboard covers the strip's bottom; the rail then holds fewer keys, not hidden ones.
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const unoccludedStrip = useMemo(
    () => getSideRailStrip({ windowWidth: width, windowHeight: height, insets, occlusions }),
    [width, height, insets, occlusions]
  )
  const strip = useMemo(
    () => sideRailStripAboveKeyboard(unoccludedStrip, keyboard),
    [unoccludedStrip, keyboard]
  )
  // Keyboard clipping changes what fits now, not this device's shortcut defaults.
  const directionPadAvailable =
    hasFoldDivision === true || hasTerminalDirectionPadSpace(unoccludedStrip)
  useEffect(() => void foldedFullScreen.load(), [])
  const remembered = useRememberedColumn(unoccludedStrip)
  const [requested, toggleWanted, requestFullScreen] = useFullScreenRequests()
  const extendedSide = extendedColumnSide({
    requested,
    fullScreen: useFoldedFullScreen(),
    column: remembered
  })
  const column = useMemo(
    () =>
      remembered && (unoccludedStrip || extendedSide)
        ? {
            side: remembered.side,
            width: remembered.width,
            extended: extendedSide !== null
          }
        : null,
    [remembered, unoccludedStrip, extendedSide]
  )
  const toggleSlot = columnToggleSlot({ wanted: toggleWanted, column, strip })
  // Extended, no screen draws in the column: the keys go back to the bottom row and Xeno to its bubble.
  // Otherwise a toggle heading the rail takes its top, and the rail starts below it.
  const railStrip = useMemo(
    () =>
      extendedSide || !strip
        ? null
        : toggleSlot
          ? {
              ...strip,
              top: strip.top + COLUMN_TOGGLE_SLOT,
              height: strip.height - COLUMN_TOGGLE_SLOT
            }
          : strip,
    [extendedSide, strip, toggleSlot]
  )
  const value = useMemo(
    () => ({
      strip: railStrip,
      directionPadAvailable,
      store,
      column,
      requestFullScreen
    }),
    [railStrip, directionPadAvailable, store, column, requestFullScreen]
  )
  return (
    <SideRailContext.Provider value={value}>
      {children}
      <SideRailOutlet />
      {toggleSlot && column ? <ColumnToggle slot={toggleSlot} extended={column.extended} /> : null}
    </SideRailContext.Provider>
  )
}

function SideRailOutlet() {
  const context = useContext(SideRailContext)
  const content = useSyncExternalStore(
    context?.store.subscribe ?? (() => () => undefined),
    () => context?.store.read() ?? null
  )
  const pinned = useSyncExternalStore(
    context?.store.subscribe ?? (() => () => undefined),
    () => context?.store.readTop() ?? null
  )
  const strip = context?.strip
  if (!strip || (!content && !pinned)) {
    return null
  }
  return (
    <View
      style={[
        styles.outlet,
        { width: strip.width, top: strip.top, bottom: strip.bottom },
        strip.side === 'right' ? { right: 0 } : { left: 0 }
      ]}
    >
      {pinned}
      {content?.node}
    </View>
  )
}

/** The status column this window has, drawn in or extended over; null for a window without one. */
export function useSideColumn(): SideColumn | null {
  return useContext(SideRailContext)?.column ?? null
}

/** Asks for the folded Duo's status column while `active`, when full screen when folded is on. */
export function useSideColumnFullScreen(active: boolean, options: FullScreenOptions = {}): void {
  const request = useContext(SideRailContext)?.requestFullScreen
  const columnToggle = options.columnToggle === true
  useEffect(
    () => (active && request ? request({ columnToggle }) : undefined),
    [active, request, columnToggle]
  )
}

/** The side strip this window has to draw in; null for a window without one, or one extended over. */
export function useSideRailStrip(): SideRailStrip | null {
  return useContext(SideRailContext)?.strip ?? null
}

export function useSideRailDirectionPadAvailable(): boolean {
  return useContext(SideRailContext)?.directionPadAvailable ?? false
}

/** Draws `node` in the side strip while this screen is mounted; null draws nothing. */
export function useSideRailContent(node: ReactNode | null): void {
  // The store outlives strip changes, which replace the context value; re-registering on them would flash the rail.
  const store = useContext(SideRailContext)?.store
  const [owner] = useState(() => Symbol('side-rail-owner'))
  useEffect(() => {
    if (!store || node === null) {
      return
    }
    store.show(owner, node)
    return () => store.hide(owner)
  }, [store, owner, node])
}

const styles = StyleSheet.create({
  outlet: { position: 'absolute' }
})

/** The app-wide pinned control, for a screen's controls to start with so it never takes their room. */
export function useSideRailPinnedNode(): ReactNode | null {
  const store = useContext(SideRailContext)?.store
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => undefined),
    () => store?.readPinned() ?? null
  )
}

/** Whether a screen has its own controls in the strip right now. */
export function useSideRailHasContent(): boolean {
  const store = useContext(SideRailContext)?.store
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => undefined),
    () => store?.read() != null
  )
}

/** Keeps `node` in the side strip on every screen: at the top, or first among the screen's own controls; null removes it. */
export function useSideRailPinned(node: ReactNode | null): void {
  const store = useContext(SideRailContext)?.store
  useEffect(() => {
    if (!store) {
      return
    }
    store.pin(node)
    return () => store.pin(null)
  }, [store, node])
}
