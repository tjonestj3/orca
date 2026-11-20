import { StyleSheet, View, useWindowDimensions } from 'react-native'
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

export function JarvisBubble() {
  const insets = useSafeAreaInsets()
  const view = useShowingSession()
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const column = useSideColumn()
  const { plus, mic, copy, question, approval } = usePageAnchors()
  const pageShowing = usePageShowing()
  const screen = useWindowDimensions()
  // Drawn over Orca's page, which can't cover it: a sheet or menu the page opens would sit under it, and an
  // agent's question has no room in its footer.
  const sheetOpen = usePageModalOpen()
  // Going back, the orb goes as the page starts to slide away, not once it has.
  const leaving = usePageLeaving()
  if (sheetOpen || leaving || (view === 'chat' && question)) {
    return null
  }
  if (!view && plus) {
    // The host list: just right of its + button, in the room its bar made (page-anchors).
    const place = plusOrbPlace(plus)
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={[styles.anchored, { left: place.left, top: place.top }]}>
          <JarvisTalkControl size={place.size} />
        </View>
      </View>
    )
  }
  if (view) {
    // In a session Xeno is a small orb by the page's own controls, its desktop's name beside it.
    const place = sessionOrbPlace({
      view,
      insetsBottom: insets.bottom,
      keyboard,
      // Full screen, the page reaches the screen's edge over the column, which the inset still counts.
      rightEdge: column?.extended && column.side === 'right' ? 0 : insets.right
    })
    if (view === 'chat' && mic) {
      // Just left of the composer's mic, wherever the page has it (page-anchors).
      const at = micOrbPlace(mic)
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.row,
              { top: at.middle - place.size / 2, right: screen.width - at.right }
            ]}
          >
            <JarvisTalkControl size={place.size} />
          </View>
        </View>
      )
    }
    if (view === 'terminal' && mic) {
      // Just right of the live input row's mic, in the room the row made (page-anchors).
      const at = terminalMicOrbPlace(mic)
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[styles.anchored, { left: at.left, top: at.top }]}>
            <JarvisTalkControl size={at.size} />
          </View>
        </View>
      )
    }
    if (view === 'chat' && approval) {
      // A permission card where the composer was: the right end of its button row (page-anchors).
      const at = approvalOrbPlace(approval, place.size)
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[styles.anchored, { left: at.left, top: at.top }]}>
            <JarvisTalkControl size={place.size} />
          </View>
        </View>
      )
    }
    if (view === 'chat' && copy) {
      // A markdown file: just left of its Copy button, on the same row (page-anchors).
      const at = micOrbPlace(copy)
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.row,
              { top: at.middle - place.size / 2, right: screen.width - at.right }
            ]}
          >
            <JarvisTalkControl size={place.size} />
          </View>
        </View>
      )
    }
    if (view === 'chat') {
      // A tab without a composer (a file, a browser): the bottom corner its controls leave free, not over the page.
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[styles.row, { bottom: place.bottom, left: insets.left + spacing.lg }]}>
            <JarvisTalkControl size={place.size} />
          </View>
        </View>
      )
    }
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={[styles.row, { bottom: place.bottom, right: place.right }]}>
          <JarvisTalkControl size={place.size} />
        </View>
      </View>
    )
  }
  if (pageShowing) {
    // A desktop page that hasn't said where the orb goes yet (it's still opening): wait, rather than flash in the
    // corner and jump to its place.
    return null
  }
  const bottom = insets.bottom + spacing.xl
  // Full screen on the folded Duo: the bubble keeps to the corner the status column was in.
  const right =
    column?.extended && column.side === 'right'
      ? Math.max(spacing.xs, (column.width - BUBBLE_SIZE) / 2)
      : insets.right + spacing.lg
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, { bottom, right }]}>
        <JarvisTalkControl size={BUBBLE_SIZE} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anchored: { position: 'absolute' }
})
