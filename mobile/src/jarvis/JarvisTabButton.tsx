import { useSyncExternalStore } from 'react'
import { View } from 'react-native'
import { spacing } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useJarvis } from './jarvis-context'
import { JarvisHostLabel } from './JarvisHostLabel'
import { JarvisTalkControl } from './JarvisTalkControl'
import { xenoTabVisible } from './jarvis-bubble-policy'

const TAB_ORB = 30
const TAB_LABEL_WIDTH = 56

/**
 * Xeno as the Home tab bar's last button: hold to talk, tap to open its screen, as the bubble and the rail orb do,
 * with the desktop's initials under it. Home keeps Xeno here, so the floating bubble never covers its button and the
 * folded Duo's column is free for the tabs to take full screen.
 */
export function JarvisTabButton() {
  const { call, reachable, pickHost } = useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const live = state.phase !== 'idle' && state.phase !== 'error'
  if (!xenoTabVisible({ live, reachable, canPick: pickHost !== null })) {
    return null
  }
  return (
    <View style={styles.tab}>
      <JarvisTalkControl size={TAB_ORB} />
      <JarvisHostLabel maxWidth={TAB_LABEL_WIDTH} initials />
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  tab: { flex: 1, minHeight: 44, alignItems: 'center', gap: 1, paddingTop: spacing.xs / 2 }
}))
