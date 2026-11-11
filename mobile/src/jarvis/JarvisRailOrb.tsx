import { View } from 'react-native'
import { spacing } from '../theme/mobile-theme'
import { JarvisTalkControl } from './JarvisTalkControl'

// Jarvis at the top of the folded iPhone Duo's side rail, sized to the strip.
export function JarvisRailOrb({ stripWidth }: { readonly stripWidth: number }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
      <JarvisTalkControl size={stripWidth - spacing.md * 2} />
    </View>
  )
}
