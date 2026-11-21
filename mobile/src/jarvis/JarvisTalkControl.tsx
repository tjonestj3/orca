import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Pressable, View } from 'react-native'
import { Ear } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { bubblePress } from './jarvis-bubble-policy'
import { jarvisOrbPhase } from './jarvis-call-types'
import { JarvisOrb } from './JarvisOrb'
import { useJarvis } from './jarvis-context'
import { useOrbTheme } from '../theme/mobile-appearance'
import { ORB_THEMES } from './orb-themes/orb-themes'

// Room around the orb that still counts as pressing it.
const GRAB_SLOP = 8

// Jarvis as a small live orb: hold to talk, tap to open the Jarvis screen (which hangs up). Used by the bubble, the
// rail, the tab bar and beside a session's mic. No ✕ on it: holding it to talk, a thumb found the ✕ and hung up.
// `scale`: how much it's shown scaled (the bubble draws it at one size and scales it to its spot): its grab area
// and badge are scaled back, so they keep their size on screen.
export function JarvisTalkControl({
  size,
  scale = 1
}: {
  readonly size: number
  readonly scale?: number
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const { call, offerUrl, voice, openJarvisScreen, pickHost, hostName } = useJarvis()
  const drawn = ORB_THEMES[useOrbTheme()].drawing !== null
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
        // Easier to catch than the orb itself, which can be small beside the mic.
        hitSlop={GRAB_SLOP / scale}
        style={({ pressed }) => [
          styles.orb,
          // A drawn theme draws its own ground; a grey one under it peeked out as the web view lagged a slide.
          drawn && styles.drawn,
          { borderRadius: size / 2 },
          pressed && pressedStyle
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          hostName
            ? t('jarvis.bubble.holdToTalkOn', 'Xeno on {{host}}. Hold to talk, tap to open.', {
                host: hostName
              })
            : t('jarvis.bubble.holdToTalk', 'Xeno. Hold to talk, tap to open.')
        }
      >
        <JarvisOrb call={call} phase={jarvisOrbPhase(state)} size={size} />
      </Pressable>
      {live ? (
        <View
          style={[
            styles.badge,
            styles.listening,
            scale !== 1 && { transform: [{ scale: 1 / scale }] }
          ]}
          // A press on the badge is a press on the orb.
          pointerEvents="none"
          accessible
          accessibilityLabel={t('jarvis.bubble.listeningForName', 'Listening for “Hey Xeno”')}
        >
          <Ear size={11} color={colors.onAccent} />
        </View>
      ) : null}
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  orb: { flex: 1, overflow: 'hidden', backgroundColor: colors.bgRaised },
  drawn: { backgroundColor: 'transparent' },
  badge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listening: { bottom: -4, right: -4, backgroundColor: colors.accentBlue }
}))
