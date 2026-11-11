import { usePathname } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing } from '../theme/mobile-theme'
import { JarvisTalkControl } from './JarvisTalkControl'

const BUBBLE_SIZE = 56
// Session screens keep a composer or terminal keys along the bottom; the bubble sits above them there.
const SESSION_BOTTOM_CLEARANCE = 132

export function JarvisBubble() {
  const insets = useSafeAreaInsets()
  const onSession = usePathname().includes('/session/')
  const bottom = insets.bottom + (onSession ? SESSION_BOTTOM_CLEARANCE : spacing.xl)
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, { bottom, right: insets.right + spacing.lg }]}>
        <JarvisTalkControl size={BUBBLE_SIZE} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  corner: { position: 'absolute' }
})
