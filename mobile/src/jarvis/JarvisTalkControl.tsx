import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Pressable, View } from 'react-native'
import { Ear, X } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { bubblePress } from './jarvis-bubble-policy'
import { JarvisOrb } from './JarvisOrb'
import { useJarvis } from './jarvis-context'

// Jarvis as a small live orb: hold to talk, tap to open the Jarvis screen, ✕ to hang up. Used by the bubble and the rail.
export function JarvisTalkControl({ size }: { readonly size: number }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { call, offerUrl, voice, handsFree, wake, openJarvisScreen, pickHost, hostName } =
    useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const live = state.phase !== 'idle' && state.phase !== 'error'
  // Read at press time, so the press keeps the latest call details without being rebuilt mid-hold.
  const latest = useRef({ offerUrl, voice, openJarvisScreen })
  latest.current = { offerUrl, voice, openJarvisScreen }
  const press = useRef(
    bubblePress({
      live: () => call.getSnapshot().phase !== 'idle' && call.getSnapshot().phase !== 'error',
      pressTalk: () => {
        if (latest.current.offerUrl) {
          call.pressTalk(latest.current.offerUrl, latest.current.voice)
        }
      },
      releaseTalk: () => call.releaseTalk(),
      cancelTalk: () => call.cancelTalk(),
      openScreen: () => latest.current.openJarvisScreen()
    })
  ).current
  useEffect(() => press.unmount, [press])

  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        disabled={!offerUrl && !pickHost}
        // Several desktops run Xeno and none was picked yet: any press asks which.
        onPress={pickHost ?? undefined}
        onPressIn={pickHost ? undefined : press.pressIn}
        onPressOut={pickHost ? undefined : press.pressOut}
        style={({ pressed }) => [styles.orb, { borderRadius: size / 2 }, pressed && pressedStyle]}
        accessibilityRole="button"
        accessibilityLabel={
          hostName
            ? t('jarvis.bubble.holdToTalkOn', 'Xeno on {{host}}. Hold to talk, tap to open.', {
                host: hostName
              })
            : t('jarvis.bubble.holdToTalk', 'Xeno. Hold to talk, tap to open.')
        }
      >
        <JarvisOrb
          call={call}
          phase={state.holding && live ? 'hearing' : state.phase}
          size={size}
          woke={state.woke}
        />
      </Pressable>
      {live ? (
        <Pressable
          onPress={() => call.hangUp()}
          hitSlop={8}
          style={({ pressed }) => [styles.badge, styles.hangUp, pressed && pressedStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.bubble.hangUp', 'Hang up Xeno')}
        >
          <X size={11} color={colors.onAccent} />
        </Pressable>
      ) : null}
      {handsFree || wake ? (
        <View
          style={[styles.badge, styles.handsFree]}
          accessible
          accessibilityLabel={
            wake
              ? t('jarvis.bubble.wake', 'Hey Xeno is on')
              : t('jarvis.bubble.handsFree', 'Hands-free is on')
          }
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
