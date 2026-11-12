import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import { usePathname, useRouter } from 'expo-router'
import { useHostProfile } from '../host-catalog/use-host-profile'
import { useSideRailPinned, useSideRailStrip } from '../layout/side-rail'
import { onDictationStarting } from '../platform/microphone-handoff'
import { bubbleVisible, railOrbVisible } from './jarvis-bubble-policy'
import { JarvisCall } from './jarvis-call'
import { JarvisContext, type JarvisContextValue } from './jarvis-context'
import { JarvisBubble } from './JarvisBubble'
import { JarvisRailOrb } from './JarvisRailOrb'
import { jarvisOfferUrl, jarvisPingUrl } from './jarvis-endpoint'
import { loadJarvisHost, rememberJarvisHost } from './jarvis-host-preference'
import { viewingTarget } from './jarvis-viewing'
import {
  loadJarvisHandsFree,
  loadJarvisVoice,
  saveJarvisHandsFree,
  saveJarvisVoice,
  type JarvisVoice
} from './jarvis-voice-preference'

const REACHABLE_POLL_MS = 15_000
const REACHABLE_TIMEOUT_MS = 4_000

function useReachable(url: string | null): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(null)
  useEffect(() => {
    if (!url) {
      setReachable(null)
      return
    }
    let stopped = false
    const check = async (): Promise<void> => {
      const abort = new AbortController()
      const timer = setTimeout(() => abort.abort(), REACHABLE_TIMEOUT_MS)
      try {
        const response = await fetch(url, { signal: abort.signal })
        if (!stopped) {
          setReachable(response.ok)
        }
      } catch {
        if (!stopped) {
          setReachable(false)
        }
      } finally {
        clearTimeout(timer)
      }
    }
    void check()
    const interval = setInterval(() => void check(), REACHABLE_POLL_MS)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [url])
  return reachable
}

// One Jarvis call for the whole app: the Jarvis screen, the bubble and the rail orb all use it.
export function JarvisProvider({ children }: { readonly children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const callRef = useRef<JarvisCall | null>(null)
  callRef.current ??= new JarvisCall()
  const call = callRef.current
  const [hostId, setHostId] = useState<string | null>(null)
  const [voice, setVoiceState] = useState<JarvisVoice>('male')
  const [handsFree, setHandsFreeState] = useState(false)
  const host = useHostProfile(hostId ?? '')
  const offerUrl = host ? jarvisOfferUrl(host.endpoint) : null
  const reachable = useReachable(host ? jarvisPingUrl(host.endpoint) : null)

  useEffect(() => {
    void loadJarvisHost().then(setHostId)
    void loadJarvisVoice().then(setVoiceState)
    void loadJarvisHandsFree().then((on) => {
      setHandsFreeState(on)
      call.setHandsFree(on)
    })
  }, [call])
  useEffect(() => call.setViewing(viewingTarget(pathname, hostId)), [call, pathname, hostId])
  useEffect(() => onDictationStarting(() => call.endFor('dictation')), [call])

  const setVoice = useCallback(
    (next: JarvisVoice) => {
      setVoiceState(next)
      void saveJarvisVoice(next)
      // The desktop picks the voice when a call starts, so switching mid-call reconnects.
      const { phase } = call.getSnapshot()
      if (offerUrl && phase !== 'idle' && phase !== 'error') {
        void call.start(offerUrl, next)
      }
    },
    [call, offerUrl]
  )
  const setHandsFree = useCallback(
    (on: boolean) => {
      setHandsFreeState(on)
      call.setHandsFree(on)
      void saveJarvisHandsFree(on)
    },
    [call]
  )
  const adoptHost = useCallback((next: string) => {
    setHostId(next)
    void rememberJarvisHost(next)
  }, [])
  const openJarvisScreen = useCallback(() => {
    if (hostId) {
      router.push({ pathname: '/h/[hostId]/jarvis', params: { hostId } })
    }
  }, [router, hostId])

  const value = useMemo<JarvisContextValue>(
    () => ({
      call,
      hostId,
      offerUrl,
      reachable,
      voice,
      setVoice,
      handsFree,
      setHandsFree,
      adoptHost,
      openJarvisScreen
    }),
    [
      call,
      hostId,
      offerUrl,
      reachable,
      voice,
      setVoice,
      handsFree,
      setHandsFree,
      adoptHost,
      openJarvisScreen
    ]
  )
  // The rail draws outside this provider, so its orb carries the context with it.
  const strip = useSideRailStrip()
  const onJarvisScreen = pathname.endsWith('/jarvis')
  const railOrb = useMemo(
    () =>
      strip && railOrbVisible({ hasStrip: true, hasHost: Boolean(hostId), onJarvisScreen }) ? (
        <JarvisContext.Provider value={value}>
          <JarvisRailOrb stripWidth={strip.width} />
        </JarvisContext.Provider>
      ) : null,
    [strip, hostId, value, onJarvisScreen]
  )
  useSideRailPinned(railOrb)
  const { phase } = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const showBubble = bubbleVisible({
    live: phase !== 'idle' && phase !== 'error',
    reachable,
    onJarvisScreen,
    railAvailable: railOrb !== null
  })
  return (
    <JarvisContext.Provider value={value}>
      {children}
      {showBubble ? <JarvisBubble /> : null}
    </JarvisContext.Provider>
  )
}
