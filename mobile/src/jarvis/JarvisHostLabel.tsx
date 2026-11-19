import { Text } from 'react-native'
import { colors, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { useSessionMonospace } from '../theme/mobile-appearance'
import { useJarvis } from './jarvis-context'
import { hostInitials } from './jarvis-bubble-policy'

// The desktop Xeno is talking to, under the orb in Home's tab bar: the one place it's in doubt with several desktops
// (in a session or a host list it's that one). As initials ("XL") there, to fit a tab.
export function JarvisHostLabel({
  maxWidth,
  initials = false
}: {
  readonly maxWidth: number
  readonly initials?: boolean
}) {
  useMobileColorScheme()
  const { hostName } = useJarvis()
  // In the session font, like the page it sits on (Settings → Appearance → Session text).
  const monospace = useSessionMonospace()
  if (!hostName) {
    return null
  }
  return (
    <Text
      style={[styles.label, monospace && styles.mono, { maxWidth }]}
      numberOfLines={1}
      accessibilityLabel={hostName}
    >
      {initials ? hostInitials(hostName) : hostName}
    </Text>
  )
}

const styles = themedStyleSheet(() => ({
  label: { color: colors.textSecondary, fontSize: typography.metaSize, textAlign: 'center' },
  mono: { fontFamily: typography.monoFamily }
}))
