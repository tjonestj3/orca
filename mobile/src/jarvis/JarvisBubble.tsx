import { useMemo, useRef } from 'react'
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import { useShowingSession } from '../session/showing-session'
import { sessionOrbPlace } from './jarvis-bubble-policy'
import { JarvisTalkControl } from './JarvisTalkControl'
import { usePageModalOpen } from './page-modal'
import {
  approvalOrbPlace,
  micOrbPlace,
  plusOrbPlace,
  terminalMicOrbPlace,
  usePageAnchors,
  usePageShowing,
  usePageLeaving
} from './page-anchors'

const BUBBLE_SIZE = 56
// No desktop name beside the orb here: in a session, a host list or settings, which desktop is clear (or doesn't
// matter); Home's tab bar, where it isn't, names it (JarvisTabButton).

type Spot = { readonly style: StyleProp<ViewStyle>; readonly size: number }

export function JarvisBubble() {
  const spot = useOrbSpot()
  // Drawn over Orca's page, which can't cover it: a sheet or menu the page opens would sit under it, and an
  // agent's question has no room in its footer. Going back, the orb goes as the page starts to slide away.
  const view = useShowingSession()
  const { question } = usePageAnchors()
  const sheetOpen = usePageModalOpen()
  const leaving = usePageLeaving()
  const hide = sheetOpen || leaving || (view === 'chat' && question !== undefined)
  // Hidden, the orb stays where it last was, only unseen: taken away and put back, a drawn theme's page would load
  // again and flash in from blank every time a menu opened or a page was still opening.
  const last = useRef<Spot | null>(null)
  if (spot && !hide) {
    last.current = spot
  }
  const shown = hide ? null : spot
  const at = shown ?? last.current
  // The orb follows the composer every frame while it moves: only where it sits changes, not the orb drawn.
  const size = at?.size
  const control = useMemo(
    () => (size === undefined ? null : <JarvisTalkControl size={size} />),
    [size]
  )
  if (!at) {
    return null
  }
  return (
    <View
      pointerEvents={shown ? 'box-none' : 'none'}
      style={[StyleSheet.absoluteFill, !shown && styles.hidden]}
    >
      <View style={at.style}>{control}</View>
    </View>
  )
}

// Where the orb goes now, or null for nowhere yet (a desktop page that hasn't said).
function useOrbSpot(): Spot | null {
  const insets = useSafeAreaInsets()
  const view = useShowingSession()
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const column = useSideColumn()
  const { plus, mic, copy, approval, keys } = usePageAnchors()
  const pageShowing = usePageShowing()
  const screen = useWindowDimensions()
  if (!view && plus) {
    // The host list: just right of its + button, in the room its bar made (page-anchors).
    const place = plusOrbPlace(plus)
    return { style: [styles.anchored, { left: place.left, top: place.top }], size: place.size }
  }
  if (view) {
    // In a session Xeno is a small orb by the page's own controls.
    const place = sessionOrbPlace({
      view,
      insetsBottom: insets.bottom,
      keyboard,
      // Full screen, the page reaches the screen's edge over the column, which the inset still counts.
      rightEdge: column?.extended && column.side === 'right' ? 0 : insets.right
    })
    // Just left of the composer's mic, or of a markdown file's Copy button, on its row (page-anchors).
    const beside = view === 'chat' ? (mic ?? (approval ? undefined : copy)) : undefined
    if (beside) {
      const at = micOrbPlace(beside)
      return {
        style: [styles.row, { top: at.middle - place.size / 2, right: screen.width - at.right }],
        size: place.size
      }
    }
    if (view === 'terminal' && mic) {
      // Just right of the live input row's mic, in the room the row made (page-anchors).
      const at = terminalMicOrbPlace(mic)
      return { style: [styles.anchored, { left: at.left, top: at.top }], size: at.size }
    }
    if (view === 'chat' && approval) {
      // A permission card where the composer was: the right end of its button row (page-anchors).
      const at = approvalOrbPlace(approval, place.size)
      return { style: [styles.anchored, { left: at.left, top: at.top }], size: place.size }
    }
    if (view === 'chat' && keys) {
      // A browser tab: the free right end of the line its keys share (page-browser-keys), level with them.
      return {
        style: [styles.row, { top: keys.y + (keys.height - place.size) / 2, right: place.right }],
        size: place.size
      }
    }
    if (view === 'chat') {
      // A tab without a composer (a file, a browser): the bottom corner its controls leave free, not over the page.
      return {
        style: [styles.row, { bottom: place.bottom, left: insets.left + spacing.lg }],
        size: place.size
      }
    }
    return { style: [styles.row, { bottom: place.bottom, right: place.right }], size: place.size }
  }
  if (pageShowing) {
    // A desktop page that hasn't said where the orb goes yet (it's still opening): wait, rather than flash in the
    // corner and jump to its place.
    return null
  }
  // Full screen on the folded Duo: the bubble keeps to the corner the status column was in.
  const right =
    column?.extended && column.side === 'right'
      ? Math.max(spacing.xs, (column.width - BUBBLE_SIZE) / 2)
      : insets.right + spacing.lg
  return {
    style: [styles.corner, { bottom: insets.bottom + spacing.xl, right }],
    size: BUBBLE_SIZE
  }
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anchored: { position: 'absolute' },
  hidden: { opacity: 0 }
})
