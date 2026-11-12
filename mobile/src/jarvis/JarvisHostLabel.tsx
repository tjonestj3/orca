import { Text } from 'react-native'
import { colors, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { useJarvis } from './jarvis-context'

// The desktop Xeno is talking to, under the bubble or rail orb, so it's never in doubt with several desktops.
export function JarvisHostLabel({ maxWidth }: { readonly maxWidth: number }) {
  useMobileColorScheme()
  const { hostName } = useJarvis()
  if (!hostName) {
    return null
  }
  return (
    <Text style={[styles.label, { maxWidth }]} numberOfLines={1}>
      {hostName}
    </Text>
  )
}

const styles = themedStyleSheet(() => ({
  label: { color: colors.textSecondary, fontSize: typography.metaSize, textAlign: 'center' }
}))
