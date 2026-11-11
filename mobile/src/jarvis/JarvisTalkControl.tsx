import { useRef, useSyncExternalStore } from 'react'
import { Pressable, View } from 'react-native'
import { Ear, X } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { classifyBubbleRelease } from './jarvis-bubble-policy'
import { JarvisOrb } from './JarvisOrb'
import { useJarvis } from './jarvis-context'

// Jarvis as a small live orb: hold to talk, tap to open the Jarvis screen, ✕ to hang up. Used by the bubble and the rail.
export function JarvisTalkControl({ size }: { readonly size: number }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { call, offerUrl, voice, handsFree, openJarvisScreen } = useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const pressedAt = useRef(0)
  const live = state.phase !== 'idle' && state.phase !== 'error'

  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        disabled={!offerUrl}
        onPressIn={() => {
          pressedAt.current = Date.now()
          if (offerUrl) {
            call.pressTalk(offerUrl, voice)
          }
        }}
        onPressOut={() => {
          if (classifyBubbleRelease(Date.now() - pressedAt.current) === 'talk') {
            call.releaseTalk()
          } else {
            call.cancelTalk()
            openJarvisScreen()
          }
        }}
        style={({ pressed }) => [styles.orb, { borderRadius: size / 2 }, pressed && pressedStyle]}
        accessibilityRole="button"
        accessibilityLabel={t('jarvis.bubble.holdToTalk', 'Jarvis. Hold to talk, tap to open.')}
      >
        <JarvisOrb
          call={call}
          phase={state.holding && live ? 'hearing' : state.phase}
          size={size}
        />
      </Pressable>
      {live ? (
        <Pressable
          onPress={() => call.hangUp()}
          hitSlop={8}
          style={({ pressed }) => [styles.badge, styles.hangUp, pressed && pressedStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.bubble.hangUp', 'Hang up Jarvis')}
        >
          <X size={11} color={colors.onAccent} />
        </Pressable>
      ) : null}
      {handsFree ? (
        <View
          style={[styles.badge, styles.handsFree]}
          accessible
          accessibilityLabel={t('jarvis.bubble.handsFree', 'Hands-free is on')}
        >
          <Ear size={11} color={colors.onAccent} />
        </View>
      ) : null}
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  orb: { flex: 1, overflow: 'hidden', backgroundColor: colors.bgRaised },
  badge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  hangUp: { top: -4, left: -4, backgroundColor: colors.statusRed },
  handsFree: { bottom: -4, right: -4, backgroundColor: colors.accentBlue }
}))
