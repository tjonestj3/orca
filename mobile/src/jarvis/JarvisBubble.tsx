import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { useSideColumn } from '../layout/side-rail'
import { useIsShowingSession } from '../session/showing-session'
import { JarvisHostLabel } from './JarvisHostLabel'
import { JarvisTalkControl } from './JarvisTalkControl'

const BUBBLE_SIZE = 56
// Session screens keep a composer or terminal keys along the bottom; the bubble sits above them there.
const SESSION_BOTTOM_CLEARANCE = 132

export function JarvisBubble() {
  const insets = useSafeAreaInsets()
  const onSession = useIsShowingSession()
  const bottom = insets.bottom + (onSession ? SESSION_BOTTOM_CLEARANCE : spacing.xl)
  // A session full screen on the folded Duo: the bubble keeps to the corner the status column was in.
  const column = useSideColumn()
  const right =
    column?.extended && column.side === 'right'
      ? Math.max(spacing.xs, (column.width - BUBBLE_SIZE) / 2)
      : insets.right + spacing.lg
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, { bottom, right }]}>
        <JarvisTalkControl size={BUBBLE_SIZE} />
        <JarvisHostLabel maxWidth={BUBBLE_SIZE + spacing.xl} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', alignItems: 'center', gap: spacing.xs }
})
