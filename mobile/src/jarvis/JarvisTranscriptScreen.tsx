import { useState, useSyncExternalStore } from 'react'
import { Alert, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, RotateCcw } from 'lucide-react-native'
import { NavBar } from '../components/nav-bar/NavBar'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { useHostProfile } from '../host-catalog/use-host-profile'
import { leaveHostRoute } from '../host-route-exit'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { newJarvisConversation, sendJarvisChat, stopJarvisChat } from './jarvis-chat'
import { useJarvis } from './jarvis-context'
import {
  jarvisChatNewUrl,
  jarvisChatStopUrl,
  jarvisChatUrl,
  jarvisHistoryUrl
} from './jarvis-endpoint'
import { useJarvisHistory } from './jarvis-history'
import { openInClaude } from './jarvis-open-in-claude'
import { columnClearance } from '../layout/folded-full-screen'
import { useSideColumn } from '../layout/side-rail'
import { SideColumnToggle, useSessionFullScreen } from '../session/side-column-full-screen'
import { JarvisChatComposer } from './JarvisChatComposer'
import { JarvisTranscript } from './JarvisTranscript'
import { useKeyboardPadding } from './use-keyboard-padding'

// The whole conversation with Xeno, full screen, and a box to type to it: one conversation with the calls, so
// what was said aloud shows here and what's typed here is known in the next call. Typed answers are never
// spoken. The call carries on meanwhile, and the bubble stays up to talk.
export function JarvisTranscriptScreen({ hostId }: { readonly hostId: string }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // Full screen when folded, like a session: the Duo's status column too, with the same button to switch it.
  useSessionFullScreen()
  const column = useSideColumn()
  const host = useHostProfile(hostId)
  const { call, offerUrl, voice } = useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const endpoint = host?.endpoint ?? null
  const { messages, working, refresh } = useJarvisHistory(
    endpoint ? jarvisHistoryUrl(endpoint) : null,
    state.messages,
    // Asked from here, Xeno has no call to open an artifact through: it comes on the tool's line.
    openInClaude
  )
  const live = state.phase !== 'idle' && state.phase !== 'error'
  // The composer rides on the keyboard; the conversation above it shrinks to fit, so nothing is ever covered.
  const keyboardPadding = useKeyboardPadding(insets.bottom)
  // Bumped on each send: the conversation goes to the newest line, like the Claude app.
  const [followKey, setFollowKey] = useState(0)
  const chatUrl = endpoint ? jarvisChatUrl(endpoint) : null

  const back = (): void => {
    if (router.canGoBack()) {
      router.back()
    } else {
      leaveHostRoute(router)
    }
  }

  const send = async (text: string): Promise<boolean> => {
    if (!chatUrl) {
      return false
    }
    // Typed from here, the person is looking at the conversation, not a worktree.
    const result = await sendJarvisChat(chatUrl, text, null)
    refresh()
    if (result.ok) {
      setFollowKey((key) => key + 1)
    }
    return result.ok
  }

  const stop = (): void => {
    const url = endpoint ? jarvisChatStopUrl(endpoint) : null
    if (url) {
      void stopJarvisChat(url).then(refresh)
    }
  }

  const startOver = (): void => {
    const url = endpoint ? jarvisChatNewUrl(endpoint) : null
    if (!url) {
      return
    }
    Alert.alert(
      t('jarvis.chat.newConfirmTitle', 'Start a new conversation?'),
      t('jarvis.chat.newConfirmBody', 'Xeno forgets this conversation. The messages stay here.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('jarvis.chat.new', 'New conversation'),
          style: 'destructive',
          onPress: () => void newJarvisConversation(url).then(refresh)
        }
      ]
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <NavBar
        style={columnClearance(column) ?? undefined}
        leading={
          <NavBarButton
            icon={ChevronLeft}
            onPress={back}
            accessibilityLabel={t('common.back', 'Back')}
          />
        }
        title={t('jarvis.transcript.title', 'Conversation')}
        subtitle={host?.name}
        trailing={
          <>
            <SideColumnToggle />
            <NavBarButton
              icon={RotateCcw}
              onPress={startOver}
              accessibilityLabel={t('jarvis.chat.new', 'New conversation')}
            />
          </>
        }
      />
      <Animated.View style={[styles.body, keyboardPadding]}>
        <JarvisTranscript
          messages={messages}
          hearing={live ? state.heard : ''}
          enabled={offerUrl != null}
          working={working}
          followKey={followKey}
          onReplay={(id) => {
            if (offerUrl) {
              call.replay(id, offerUrl, voice)
            }
          }}
        />
        <JarvisChatComposer
          enabled={chatUrl != null}
          working={working}
          onSend={send}
          onStop={stop}
          calling={live}
          onCall={() => offerUrl && void call.start(offerUrl, voice)}
          onHangUp={() => call.hangUp()}
        />
      </Animated.View>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  container: { flex: 1, backgroundColor: colors.bgBase },
  body: { flex: 1 }
}))
