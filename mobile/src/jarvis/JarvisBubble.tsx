import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useKeyboardOcclusion } from '../platform/keyboard/keyboard-occlusion'
import { useShowingSession } from '../session/showing-session'
import { sessionOrbPlace } from './jarvis-bubble-policy'
import { JarvisHostLabel } from './JarvisHostLabel'
import { JarvisTalkControl } from './JarvisTalkControl'
import { usePageModalOpen } from './page-modal'

const BUBBLE_SIZE = 56
// Beside the small orb in a session, the desktop's initials.
const SESSION_LABEL_WIDTH = 48

export function JarvisBubble() {
  const insets = useSafeAreaInsets()
  const view = useShowingSession()
  const keyboard = Math.max(0, useKeyboardOcclusion())
  const column = useSideColumn()
  // Drawn over Orca's page, which can't cover it: a sheet or menu the page opens would sit under it.
  if (usePageModalOpen()) {
    return null
  }
  if (view) {
    // In a session Xeno is a small orb by the page's own controls, its desktop's name to its left.
    const place = sessionOrbPlace({
      view,
      insetsBottom: insets.bottom,
      keyboard,
      rightEdge: insets.right
    })
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={[styles.row, { bottom: place.bottom, right: place.right }]}>
          <JarvisHostLabel maxWidth={SESSION_LABEL_WIDTH} initials />
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
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }
})
