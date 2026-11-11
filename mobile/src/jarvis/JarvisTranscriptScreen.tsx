import { useSyncExternalStore } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { NavBar } from '../components/nav-bar/NavBar'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { useHostProfile } from '../host-catalog/use-host-profile'
import { leaveHostRoute } from '../host-route-exit'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { useJarvis } from './jarvis-context'
import { jarvisHistoryUrl } from './jarvis-endpoint'
import { useJarvisHistory } from './jarvis-history'
import { JarvisTranscript } from './JarvisTranscript'

// The whole conversation with Jarvis, full screen. The call carries on meanwhile, and the bubble stays up to talk.
export function JarvisTranscriptScreen({ hostId }: { readonly hostId: string }) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const host = useHostProfile(hostId)
  const { call, offerUrl, voice } = useJarvis()
  const state = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const messages = useJarvisHistory(host ? jarvisHistoryUrl(host.endpoint) : null, state.messages)
  const live = state.phase !== 'idle' && state.phase !== 'error'

  const back = (): void => {
    if (router.canGoBack()) {
      router.back()
    } else {
      leaveHostRoute(router)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <NavBar
        leading={
          <NavBarButton
            icon={ChevronLeft}
            onPress={back}
            accessibilityLabel={t('common.back', 'Back')}
          />
        }
        title={t('jarvis.transcript.title', 'Conversation')}
        subtitle={host?.name}
      />
      <JarvisTranscript
        messages={messages}
        hearing={live ? state.heard : ''}
        enabled={offerUrl != null}
        onReplay={(id) => {
          if (offerUrl) {
            call.replay(id, offerUrl, voice)
          }
        }}
      />
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  container: { flex: 1, backgroundColor: colors.bgBase }
}))
