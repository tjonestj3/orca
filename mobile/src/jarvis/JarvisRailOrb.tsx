import { View } from 'react-native'
import { useSideRailHasContent } from '../layout/side-rail'
import { spacing } from '../theme/mobile-theme'
import { railOrbSize } from './jarvis-bubble-policy'
import { JarvisTalkControl } from './JarvisTalkControl'

// Jarvis in the folded iPhone Duo's side rail: at the top, sized to the strip, or key-sized after a worktree's
// shortcut keys so it never covers them.
export function JarvisRailOrb({ stripWidth }: { readonly stripWidth: number }) {
  const besideKeys = useSideRailHasContent()
  return (
    <View style={{ alignItems: 'center', paddingVertical: besideKeys ? spacing.xs : spacing.sm }}>
      <JarvisTalkControl size={railOrbSize(stripWidth, besideKeys)} />
    </View>
  )
}
