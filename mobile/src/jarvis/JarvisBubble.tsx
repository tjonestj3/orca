import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import { useShowingSession, type SessionView } from '../session/showing-session'
import { sessionOrbPlace } from './jarvis-bubble-policy'
import { useJarvis } from './jarvis-context'
import { JarvisTalkControl } from './JarvisTalkControl'
import { useOrbKeyboardRide } from './use-orb-keyboard-ride'
import { usePageModalOpenFor } from './page-modal'
import {
  approvalOrbPlace,
  micOrbPlace,
  plusOrbPlace,
  terminalMicOrbPlace,
  usePageShowing,
  type PageAnchor,
  type PageAnchorName
} from './page-anchors'
import { usePageAnchorsFor } from './page-anchor-store'

const BUBBLE_SIZE = 56
// The orb is always drawn this size and scaled to its spot's: a drawn theme is a canvas in a web view, which
// cleared and redrew when resized, so going from the small orb by a session's mic to the larger one by the
// host list's + hiccuped (Nov 20). Scaled, it grows or shrinks smoothly instead. Drawn at the largest size, so
// scaling only ever shrinks it and it stays sharp.
const DRAWN_SIZE = BUBBLE_SIZE
const RESIZE_MS = 180
// No desktop name beside the orb here: in a session, a host list or settings, which desktop is clear (or doesn't
// matter); Home's tab bar, where it isn't, names it (JarvisTabButton).

type Anchors = Readonly<Partial<Record<PageAnchorName, PageAnchor>>>
type Area = { readonly width: number; readonly height: number }

// Where the orb goes, in the coordinates of what it's drawn over (the window, or a page's screen). `top` goes
// through use-orb-keyboard-ride, which would otherwise keep a top it set earlier (Nov 20: off centre by the +
// after a back swipe). `rides`: by a control on the page that moves with the keyboard.
type Spot = {
  readonly left: number
  readonly top: number
  readonly size: number
  readonly rides: boolean
}

const NO_ANCHORS: Anchors = {}

/**
 * Xeno's orb over any screen without a desktop page of its own: the corner, or the column's. A screen showing a
 * desktop page draws its own (PageOrb), so the orb moves with that screen as it slides in or away.
 */
export function JarvisBubble() {
  const view = useShowingSession()
  const pageScreen = usePageShowing()
  const area = useWindowDimensions()
  const spot = useOrbSpot(view, NO_ANCHORS, area)
  return pageScreen ? null : <Orb spot={spot} hide={false} />
}

/**
 * Xeno's orb drawn inside a desktop page's screen, by the page's own controls (its anchors): it slides with the
 * screen like the page's own buttons do (Nov 20: drawn over every screen, it slid across a chat going back, after
 * the host list's + hidden under it). Shown while its screen is the one in front, or still sliding away.
 */
export function PageOrb({
  page,
  view,
  visible
}: {
  readonly page: string | null
  readonly view: SessionView | null
  readonly visible: boolean
}) {
  const { orbShown } = useJarvis()
  const anchors = usePageAnchorsFor(page)
  const sheetOpen = usePageModalOpenFor(page)
  // The screen's own size, for spots placed from its edges: a layout's, so it never catches a slide midway.
  const window = useWindowDimensions()
  const [area, setArea] = useState<Area | null>(null)
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setArea((held) => (held?.width === width && held.height === height ? held : { width, height }))
  }
  // Until the page says where its controls are, the orb waits rather than flash in a corner and jump.
  const reported = Object.keys(anchors).length > 0
  const spot = useOrbSpot(view, anchors, area ?? window, !reported)
  // Drawn over Orca's page, which can't cover it: a sheet or menu the page opens would sit under it, and an
  // agent's question has no room in its footer.
  const hide = sheetOpen || (view === 'chat' && anchors.question !== undefined)
  if (!orbShown) {
    return null
  }
  // Out of front it's hidden, not taken away: put back, a drawn theme's canvas would load and draw again from
  // blank each time the screen came back (Nov 20).
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Orb spot={spot} hide={hide || !visible} />
    </View>
  )
}

function Orb({ spot, hide }: { readonly spot: Spot | null; readonly hide: boolean }) {
  // Hidden, the orb stays where it last was, only unseen: taken away and put back, a drawn theme's page would load
  // again and flash in from blank every time a menu opened or a page was still opening.
  const last = useRef<Spot | null>(null)
  if (spot && !hide) {
    last.current = spot
  }
  const shown = hide ? null : spot
  const at = shown ?? last.current
  // The orb follows the composer every frame while it moves: only where it sits changes, not the orb drawn, and
  // a new size only scales it (DRAWN_SIZE).
  const scale = (at?.size ?? DRAWN_SIZE) / DRAWN_SIZE
  const control = useMemo(() => <JarvisTalkControl size={DRAWN_SIZE} scale={scale} />, [scale])
  const scaled = useSharedValue(scale)
  useEffect(() => {
    scaled.value = withTiming(scale, { duration: RESIZE_MS, easing: Easing.out(Easing.quad) })
  }, [scale, scaled])
  const scaling = useAnimatedStyle(() => ({ transform: [{ scale: scaled.value }] }))
  const ride = useOrbKeyboardRide(at?.top ?? 0, at?.rides ?? false, useSafeAreaInsets().bottom)
  if (!at) {
    return null
  }
  return (
    <View
      pointerEvents={shown ? 'box-none' : 'none'}
      style={[StyleSheet.absoluteFill, !shown && styles.hidden]}
    >
      <Animated.View
        style={[styles.spot, { left: at.left, width: at.size, height: at.size }, ride]}
      >
        <Animated.View
          style={[
            styles.drawn,
            { left: (at.size - DRAWN_SIZE) / 2, top: (at.size - DRAWN_SIZE) / 2 },
            scaling
          ]}
        >
          {control}
        </Animated.View>
      </Animated.View>
    </View>
  )
}

// Where the orb goes now, or null for nowhere yet (a desktop page that hasn't said: `waiting`).
function useOrbSpot(
  view: SessionView | null,
  anchors: Anchors,
  area: Area,
  waiting = false
): Spot | null {
  const insets = useSafeAreaInsets()
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const column = useSideColumn()
  const { plus, mic, copy, approval, keys } = anchors
  if (!view && plus) {
    // The host list: just right of its + button, in the room its bar made (page-anchors). Its bar isn't known to
    // ride the keyboard, so the orb waits for the page there.
    const place = plusOrbPlace(plus)
    return { left: place.left, top: place.top, rides: false, size: place.size }
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
    const size = place.size
    // Just left of the composer's mic, or of a markdown file's Copy button, on its row (page-anchors).
    const beside = view === 'chat' ? (mic ?? (approval ? undefined : copy)) : undefined
    if (beside) {
      const at = micOrbPlace(beside)
      return { left: at.right - size, top: at.middle - size / 2, rides: true, size }
    }
    if (view === 'terminal' && mic) {
      // Just right of the live input row's mic, in the room the row made (page-anchors).
      const at = terminalMicOrbPlace(mic)
      return { left: at.left, top: at.top, rides: true, size: at.size }
    }
    if (view === 'chat' && approval) {
      // A permission card where the composer was: the right end of its button row (page-anchors).
      const at = approvalOrbPlace(approval, size)
      return { left: at.left, top: at.top, rides: true, size }
    }
    if (view === 'chat' && keys) {
      // A browser tab: the free right end of the line its keys share (page-browser-keys), level with them.
      const top = keys.y + (keys.height - size) / 2
      return { left: area.width - place.right - size, top, rides: true, size }
    }
    if (waiting) {
      return null
    }
    const top = area.height - place.bottom - size
    if (view === 'chat') {
      // A tab without a composer (a file, a browser): the bottom corner its controls leave free, not over the page.
      return { left: insets.left + spacing.lg, top, rides: false, size }
    }
    return { left: area.width - place.right - size, top, rides: false, size }
  }
  if (waiting) {
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
    left: area.width - right - BUBBLE_SIZE,
    top: area.height - (insets.bottom + spacing.xl) - BUBBLE_SIZE,
    rides: false,
    size: BUBBLE_SIZE
  }
}

const styles = StyleSheet.create({
  spot: { position: 'absolute' },
  drawn: { position: 'absolute', width: DRAWN_SIZE, height: DRAWN_SIZE },
  hidden: { opacity: 0 }
})
