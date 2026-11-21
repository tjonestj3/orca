import { useMemo, useRef } from 'react'
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import { useShowingSession } from '../session/showing-session'
import { sessionOrbPlace } from './jarvis-bubble-policy'
import { JarvisTalkControl } from './JarvisTalkControl'
import { useOrbKeyboardRide } from './use-orb-keyboard-ride'
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

// `top` is always given, not left to the style: it goes through use-orb-keyboard-ride, which would otherwise keep
// a top it set earlier (Nov 20: off centre by the + after a back swipe). `rides`: by a control on the page that
// moves with the keyboard, so the orb follows the keyboard frame by frame.
type Spot = {
  readonly style: StyleProp<ViewStyle>
  readonly size: number
  readonly top: number
  readonly rides: boolean
}

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
  const ride = useOrbKeyboardRide(at?.top ?? 0, at?.rides ?? false, useSafeAreaInsets().bottom)
  if (!at) {
    return null
  }
  return (
    <View
      pointerEvents={shown ? 'box-none' : 'none'}
      style={[StyleSheet.absoluteFill, !shown && styles.hidden]}
    >
      <Animated.View style={[at.style, ride]}>{control}</Animated.View>
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
    // Its bar isn't known to ride the keyboard, so the orb waits for the page there.
    return {
      style: [styles.anchored, { left: place.left }],
      top: place.top,
      rides: false,
      size: place.size
    }
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
        style: [styles.row, { right: screen.width - at.right }],
        top: at.middle - place.size / 2,
        rides: true,
        size: place.size
      }
    }
    if (view === 'terminal' && mic) {
      // Just right of the live input row's mic, in the room the row made (page-anchors).
      const at = terminalMicOrbPlace(mic)
      return {
        style: [styles.anchored, { left: at.left }],
        top: at.top,
        rides: true,
        size: at.size
      }
    }
    if (view === 'chat' && approval) {
      // A permission card where the composer was: the right end of its button row (page-anchors).
      const at = approvalOrbPlace(approval, place.size)
      return {
        style: [styles.anchored, { left: at.left }],
        top: at.top,
        rides: true,
        size: place.size
      }
    }
    if (view === 'chat' && keys) {
      // A browser tab: the free right end of the line its keys share (page-browser-keys), level with them.
      return {
        style: [styles.row, { right: place.right }],
        top: keys.y + (keys.height - place.size) / 2,
        rides: true,
        size: place.size
      }
    }
    if (view === 'chat') {
      // A tab without a composer (a file, a browser): the bottom corner its controls leave free, not over the page.
      return {
        style: [styles.row, { left: insets.left + spacing.lg }],
        top: screen.height - place.bottom - place.size,
        rides: false,
        size: place.size
      }
    }
    return {
      style: [styles.row, { right: place.right }],
      top: screen.height - place.bottom - place.size,
      rides: false,
      size: place.size
    }
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
    style: [styles.corner, { right }],
    top: screen.height - (insets.bottom + spacing.xl) - BUBBLE_SIZE,
    rides: false,
    size: BUBBLE_SIZE
  }
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anchored: { position: 'absolute' },
  hidden: { opacity: 0 }
})
