import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppState, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Mic, MicOff, PhoneOff } from 'lucide-react-native'
import { NavBar } from '../components/nav-bar/NavBar'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { MobileSegmentedControl } from '../components/MobileSegmentedControl'
import { useHostProfile } from '../host-catalog/use-host-profile'
import { leaveHostRoute } from '../host-route-exit'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { JarvisCall, type JarvisCallSnapshot } from './jarvis-call'
import { jarvisOfferUrl } from './jarvis-endpoint'
import { JarvisOrb } from './JarvisOrb'
import { loadJarvisVoice, saveJarvisVoice, type JarvisVoice } from './jarvis-voice-preference'

type Translate = ReturnType<typeof useMobileTranslation>

function statusLine(state: JarvisCallSnapshot, t: Translate): string {
  if (state.error === 'microphone') {
    return t(
      'jarvis.screen.microphoneBlocked',
      'Jarvis needs the microphone. Allow it for Orca in Settings.'
    )
  }
  if (state.error === 'unreachable') {
    return t('jarvis.screen.unreachable', "Couldn't reach Jarvis on this computer. Is it running?")
  }
  if (state.error === 'dropped') {
    return t('jarvis.screen.dropped', 'The call dropped. Tap to talk again.')
  }
  switch (state.phase) {
    case 'connecting':
      return t('jarvis.screen.connecting', 'Connecting…')
    case 'listening':
      return state.muted
        ? t('jarvis.screen.muted', 'Muted')
        : t('jarvis.screen.listening', 'Listening')
    case 'hearing':
      return t('jarvis.screen.hearing', 'Hearing you')
    case 'thinking':
      return t('jarvis.screen.thinking', 'Thinking')
    case 'speaking':
      return t('jarvis.screen.speaking', 'Speaking')
    default:
      return t('jarvis.screen.tapToTalk', 'Tap to talk')
  }
}

// Talk to Jarvis, the voice assistant that runs beside Orca on the paired desktop.
export function JarvisScreen({ hostId }: { readonly hostId: string }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const host = useHostProfile(hostId)
  const callRef = useRef<JarvisCall | null>(null)
  callRef.current ??= new JarvisCall()
  const call = callRef.current
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const [voice, setVoice] = useState<JarvisVoice>('male')

  useEffect(() => {
    void loadJarvisVoice().then(setVoice)
  }, [])
  // Leaving the screen ends the call; so does leaving the app, which iOS would suspend mid-call anyway.
  useEffect(() => () => call.hangUp(), [call])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        call.hangUp()
      }
    })
    return () => subscription.remove()
  }, [call])

  const offerUrl = host ? jarvisOfferUrl(host.endpoint) : null
  const live = state.phase !== 'idle' && state.phase !== 'error'
  const start = (withVoice: JarvisVoice): void => {
    if (offerUrl) {
      void call.start(offerUrl, withVoice)
    }
  }
  const chooseVoice = (next: JarvisVoice): void => {
    setVoice(next)
    void saveJarvisVoice(next)
    // The desktop picks the voice when the call starts, so switching mid-call reconnects.
    if (live) {
      start(next)
    }
  }
  const back = (): void => {
    if (router.canGoBack()) {
      router.back()
    } else {
      leaveHostRoute(router)
    }
  }

  const orbSize = Math.min(width - spacing.xl * 2, height * 0.42, 360)

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }
      ]}
    >
      <NavBar
        leading={
          <NavBarButton
            icon={ChevronLeft}
            onPress={back}
            accessibilityLabel={t('common.back', 'Back')}
          />
        }
        title={t('jarvis.screen.title', 'Jarvis')}
        subtitle={host?.name}
      />
      <View style={styles.stage}>
        <JarvisOrb call={call} phase={state.phase} size={orbSize} />
        <Text
          style={[styles.status, state.error ? styles.statusError : null]}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {statusLine(state, t)}
        </Text>
      </View>
      <View style={styles.captions} accessibilityLiveRegion="polite">
        {state.heard ? (
          <Text style={styles.heard} numberOfLines={2}>
            {t('jarvis.screen.youSaid', 'You: {{text}}', { text: state.heard })}
          </Text>
        ) : null}
        {state.said ? (
          <Text style={styles.said} numberOfLines={4}>
            {state.said}
          </Text>
        ) : null}
      </View>
      <View style={styles.controls}>
        <View style={styles.sideControl}>
          {live ? (
            <Pressable
              onPress={() => call.setMuted(!state.muted)}
              style={({ pressed }) => [
                styles.smallButton,
                state.muted && styles.mutedButton,
                pressed && pressedStyle
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: state.muted }}
              accessibilityLabel={
                state.muted
                  ? t('jarvis.screen.unmute', 'Unmute microphone')
                  : t('jarvis.screen.mute', 'Mute microphone')
              }
            >
              {state.muted ? (
                <MicOff size={20} color={colors.statusRed} />
              ) : (
                <Mic size={20} color={colors.textPrimary} />
              )}
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => (live ? call.hangUp() : start(voice))}
          disabled={!live && !offerUrl}
          style={({ pressed }) => [
            styles.talkButton,
            live && styles.hangUpButton,
            pressed && pressedStyle
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            live ? t('jarvis.screen.hangUp', 'Hang up') : t('jarvis.screen.talk', 'Talk to Jarvis')
          }
        >
          {live ? (
            <PhoneOff size={28} color={colors.onAccent} />
          ) : (
            <Mic size={28} color={colors.onAccent} />
          )}
        </Pressable>
        <View style={styles.sideControl} />
      </View>
      <MobileSegmentedControl<JarvisVoice>
        style={styles.voices}
        segments={[
          { value: 'male', label: t('jarvis.screen.male', 'Male') },
          { value: 'female', label: t('jarvis.screen.female', 'Female') }
        ]}
        selected={voice}
        onSelect={chooseVoice}
        testIDPrefix="jarvis-voice"
      />
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  container: { flex: 1, backgroundColor: colors.bgBase },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  status: { color: colors.textSecondary, fontSize: typography.bodySize, letterSpacing: 0.3 },
  statusError: { color: colors.statusRed, textAlign: 'center', paddingHorizontal: spacing.xl },
  captions: {
    minHeight: 84,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
    justifyContent: 'flex-end'
  },
  heard: { color: colors.textSecondary, fontSize: typography.metaSize, textAlign: 'center' },
  said: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    textAlign: 'center',
    lineHeight: 20
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg
  },
  sideControl: { width: 48, alignItems: 'center' },
  smallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised
  },
  mutedButton: { borderWidth: 1, borderColor: colors.statusRed },
  talkButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentBlue
  },
  hangUpButton: { backgroundColor: colors.statusRed },
  voices: { alignSelf: 'center', marginHorizontal: spacing.xl }
}))
