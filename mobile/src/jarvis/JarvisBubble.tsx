import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import { useShowingSession } from '../session/showing-session'
import { sessionOrbPlace } from './jarvis-bubble-policy'
import { JarvisHostLabel } from './JarvisHostLabel'
import { JarvisTalkControl } from './JarvisTalkControl'
import { usePageModalOpen } from './page-modal'
import { micOrbPlace, plusOrbPlace, usePageAnchors } from './page-anchors'

const BUBBLE_SIZE = 56
// Beside the small orb in a session, the desktop's name has the composer's empty middle to itself.
const SESSION_LABEL_WIDTH = 150

export function JarvisBubble() {
  const insets = useSafeAreaInsets()
  const view = useShowingSession()
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const column = useSideColumn()
  const { plus, mic, question } = usePageAnchors()
  const screen = useWindowDimensions()
  // Drawn over Orca's page, which can't cover it: a sheet or menu the page opens would sit under it, and an
  // agent's question has no room in its footer.
  const sheetOpen = usePageModalOpen()
  if (sheetOpen || (view === 'chat' && question)) {
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
            <JarvisHostLabel maxWidth={SESSION_LABEL_WIDTH} />
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
            <JarvisHostLabel maxWidth={SESSION_LABEL_WIDTH} initials />
          </View>
        </View>
      )
    }
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={[styles.row, { bottom: place.bottom, right: place.right }]}>
          <JarvisHostLabel maxWidth={SESSION_LABEL_WIDTH} />
          <JarvisTalkControl size={place.size} />
        </View>
      </View>
    )
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
        <JarvisHostLabel maxWidth={BUBBLE_SIZE + spacing.xl} initials />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anchored: { position: 'absolute' }
})
