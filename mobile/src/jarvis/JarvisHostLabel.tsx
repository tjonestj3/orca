import { Text } from 'react-native'
import { colors, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { useJarvis } from './jarvis-context'
import { hostInitials } from './jarvis-bubble-policy'

// The desktop Xeno is talking to, under the bubble or rail orb, so it's never in doubt with several desktops. Beside
// the bubble and the small session orb it's initials ("XL"), which keep out of the page's controls; the rail has room.
export function JarvisHostLabel({
  maxWidth,
  initials = false
}: {
  readonly maxWidth: number
  readonly initials?: boolean
}) {
  useMobileColorScheme()
  const { hostName } = useJarvis()
  if (!hostName) {
    return null
  }
  return (
    <Text style={[styles.label, { maxWidth }]} numberOfLines={1} accessibilityLabel={hostName}>
      {initials ? hostInitials(hostName) : hostName}
    </Text>
  )
}

const styles = themedStyleSheet(() => ({
  label: { color: colors.textSecondary, fontSize: typography.metaSize, textAlign: 'center' }
}))
