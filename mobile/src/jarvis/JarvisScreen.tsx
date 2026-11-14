import { useState, useSyncExternalStore } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  AudioLines,
  ChevronDown,
  ChevronLeft,
  Ear,
  MessagesSquare,
  Mic,
  PhoneOff,
  RotateCcw
} from 'lucide-react-native'
import { NavBar } from '../components/nav-bar/NavBar'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { PickerListDrawer } from '../components/PickerListDrawer'
import { useHostProfile } from '../host-catalog/use-host-profile'
import { leaveHostRoute } from '../host-route-exit'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisCallSnapshot } from './jarvis-call-types'
import { useJarvis } from './jarvis-context'
import { jarvisHistoryUrl, jarvisVoicesUrl, jarvisWorktreesUrl } from './jarvis-endpoint'
import { useJarvisHistory } from './jarvis-history'
import { JarvisOrb } from './JarvisOrb'
import { stageOrbSize } from './jarvis-screen-layout'
import { chosenVoice, useJarvisVoices, voiceDetail } from './jarvis-voices'
import { useJarvisWorktrees } from './jarvis-worktrees'
import { JarvisWorktreePanel } from './JarvisWorktreePanel'

type Translate = ReturnType<typeof useMobileTranslation>

function statusLine(state: JarvisCallSnapshot, t: Translate): string {
  if (state.error === 'microphone') {
    return t(
      'jarvis.screen.microphoneBlocked',
      'Xeno needs the microphone. Allow it for Xeno in Settings.'
    )
  }
  if (state.error === 'unreachable') {
    return t('jarvis.screen.unreachable', "Couldn't reach Xeno on this computer. Is it running?")
  }
  if (state.error === 'dropped') {
    return t('jarvis.screen.dropped', 'The call dropped. Hold to talk again.')
  }
  if (state.error === 'idle') {
    return t('jarvis.screen.idleHungUpWake', 'Hung up after an hour with nobody saying “Hey Xeno”.')
  }
  if (state.error === 'dictation') {
    return t('jarvis.screen.dictationHungUp', 'Xeno hung up so you could dictate.')
  }
  switch (state.phase) {
    case 'connecting':
      return t('jarvis.screen.connecting', 'Connecting…')
    case 'listening':
      return t('jarvis.screen.listeningForName', 'Say “Hey Xeno” to talk')
    case 'hearing':
      return state.woke
        ? t('jarvis.screen.hearingWoke', 'Xeno is listening')
        : t('jarvis.screen.hearing', 'Hearing you')
    case 'thinking':
      return t('jarvis.screen.thinking', 'Thinking')
    case 'speaking':
      return t('jarvis.screen.speaking', 'Speaking')
    default:
      return t('jarvis.screen.tapOrHold', 'Tap to start, or hold to talk')
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
  // The app-wide call: leaving this screen or the app keeps it going.
  const { call, offerUrl, voice, setVoice } = useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const openMic = state.wake
  // The voice menu: the desktop's voices, asked for once the screen knows the desktop.
  const [choosingVoice, setChoosingVoice] = useState(false)
  const voices = useJarvisVoices(host ? jarvisVoicesUrl(host.endpoint) : null)
  const current = chosenVoice(voice, voices)
  const { worktrees, reachable } = useJarvisWorktrees(
    host ? jarvisWorktreesUrl(host.endpoint) : null
  )
  const messages = useJarvisHistory(host ? jarvisHistoryUrl(host.endpoint) : null, state.messages)

  const live = state.phase !== 'idle' && state.phase !== 'error'
  const ask = (text: string): void => {
    if (offerUrl) {
      call.ask(text, offerUrl, voice)
    }
  }
  // Jarvis says it again after whatever is playing; with no call, a call opens with it.
  const replay = (id?: number): void => {
    if (offerUrl) {
      call.replay(id, offerUrl, voice)
    }
  }
  // Pushed over this screen, so Back returns here and the call carries on meanwhile.
  const openInOrca = (worktreeId: string): void => {
    router.push({ pathname: '/h/[hostId]/session/[worktreeId]', params: { hostId, worktreeId } })
  }
  // The whole conversation, pushed over this screen like a worktree.
  const openTranscript = (): void => {
    router.push({ pathname: '/h/[hostId]/jarvis-transcript', params: { hostId } })
  }
  const back = (): void => {
    if (router.canGoBack()) {
      router.back()
    } else {
      leaveHostRoute(router)
    }
  }

  const orbSize = stageOrbSize(width, height)

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }
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
        title={t('jarvis.screen.title', 'Xeno')}
        subtitle={host?.name}
        trailing={
          <NavBarButton
            icon={MessagesSquare}
            onPress={openTranscript}
            accessibilityLabel={t('jarvis.screen.openTranscript', 'See the whole conversation')}
          />
        }
      />
      <View style={styles.stage}>
        <JarvisOrb call={call} phase={state.phase} size={orbSize} woke={state.woke} />
        <Text
          style={[styles.status, state.error ? styles.statusError : null]}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {statusLine(state, t)}
        </Text>
      </View>
      {state.heard || state.said ? (
        <Pressable
          onPress={openTranscript}
          style={({ pressed }) => [styles.captions, pressed && pressedStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.screen.openTranscript', 'See the whole conversation')}
          accessibilityLiveRegion="polite"
        >
          {state.heard ? (
            <Text style={styles.heard} numberOfLines={1}>
              {t('jarvis.screen.youSaid', 'You: {{text}}', { text: state.heard })}
            </Text>
          ) : null}
          {state.said ? (
            <Text style={styles.said} numberOfLines={2}>
              {state.said}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
      <JarvisWorktreePanel
        cards={state.cards}
        worktrees={worktrees}
        reachable={reachable}
        enabled={offerUrl != null}
        onAsk={ask}
        onOpen={openInOrca}
        messages={messages}
        hearing={live ? state.heard : ''}
        onReplay={replay}
      />
      <View style={styles.controls}>
        <View style={styles.sideControl}>
          {live ? (
            <Pressable
              onPress={() => call.hangUp()}
              style={({ pressed }) => [
                styles.smallButton,
                styles.hangUpButton,
                pressed && pressedStyle
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('jarvis.screen.hangUp', 'Hang up')}
            >
              <PhoneOff size={20} color={colors.onAccent} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPressIn={() => offerUrl && call.pressTalk(offerUrl, voice)}
          onPressOut={() => call.releaseTalk()}
          disabled={!offerUrl}
          style={({ pressed }) => [
            styles.talkButton,
            (state.holding || (openMic && live)) && styles.talkButtonOpen,
            pressed && pressedStyle
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.screen.talk', 'Hold to talk to Xeno')}
        >
          {openMic && live ? (
            <Ear size={28} color={colors.onAccent} />
          ) : (
            <Mic size={28} color={colors.onAccent} />
          )}
        </Pressable>
        <View style={styles.sideControl}>
          {messages.some((m) => m.kind !== 'you') ? (
            <Pressable
              onPress={() => replay()}
              disabled={!offerUrl}
              style={({ pressed }) => [styles.smallButton, pressed && pressedStyle]}
              accessibilityRole="button"
              accessibilityLabel={t('jarvis.screen.playLast', 'Play the last message again')}
            >
              <RotateCcw size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.settingsRow}>
        <Pressable
          onPress={() => setChoosingVoice(true)}
          style={({ pressed }) => [styles.voiceButton, pressed && pressedStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.screen.voiceMenu', 'Xeno’s voice: {{name}}. Change it', {
            name: current?.name ?? voice
          })}
          testID="jarvis-voice-menu"
        >
          <AudioLines size={16} color={colors.textSecondary} />
          <Text style={styles.voiceLabel} numberOfLines={1}>
            {current?.name ?? voice}
          </Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      <PickerListDrawer
        visible={choosingVoice}
        title={t('jarvis.screen.voiceMenuTitle', 'Xeno’s voice')}
        items={voices.map((option) => ({
          id: option.id,
          label: option.name,
          detail: voiceDetail(option)
        }))}
        selectedId={current?.id ?? voice}
        onSelect={(item) => setVoice(item.id)}
        onClose={() => setChoosingVoice(false)}
      />
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  container: { flex: 1, backgroundColor: colors.bgBase },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm
  },
  status: { color: colors.textSecondary, fontSize: typography.bodySize, letterSpacing: 0.3 },
  statusError: { color: colors.statusRed, textAlign: 'center', paddingHorizontal: spacing.xl },
  captions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    justifyContent: 'flex-start'
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
    paddingVertical: spacing.sm
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
  talkButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentBlue
  },
  talkButtonOpen: { backgroundColor: colors.statusGreen },
  hangUpButton: { backgroundColor: colors.statusRed },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.bgRaised,
    maxWidth: '100%'
  },
  voiceLabel: { color: colors.textPrimary, fontSize: typography.bodySize, flexShrink: 1 }
}))
