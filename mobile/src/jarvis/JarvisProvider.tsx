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
import { AppState } from 'react-native'
import { OrcaXenoTalk } from '../../modules/orca-xeno-talk/src'
import { useSideRailPinned, useSideRailStrip } from '../layout/side-rail'
import { onDictationStarting } from '../platform/microphone-handoff'
import { actionButtonPress, bubbleVisible, railOrbVisible } from './jarvis-bubble-policy'
import { JarvisCall } from './jarvis-call'
import { JarvisContext, type JarvisContextValue } from './jarvis-context'
import { JarvisBubble } from './JarvisBubble'
import { JarvisRailOrb } from './JarvisRailOrb'
import { jarvisOfferUrl } from './jarvis-endpoint'
import { chooseXenoHost, hostIdFromPath } from './jarvis-host-choice'
import { JarvisHostPicker } from './JarvisHostPicker'
import { useXenoHosts } from './use-xeno-hosts'
import { loadJarvisHost, rememberJarvisHost } from './jarvis-host-preference'
import { viewingTarget } from './jarvis-viewing'
import {
  loadJarvisHandsFree,
  loadJarvisWake,
  loadJarvisVoice,
  saveJarvisHandsFree,
  saveJarvisWake,
  saveJarvisVoice,
  type JarvisVoice
} from './jarvis-voice-preference'

// One Jarvis call for the whole app: the Jarvis screen, the bubble and the rail orb all use it.
export function JarvisProvider({ children }: { readonly children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const callRef = useRef<JarvisCall | null>(null)
  callRef.current ??= new JarvisCall()
  const call = callRef.current
  // The last desktop you were in with Xeno running, remembered; a live call's own desktop while it lasts.
  const [lastHostId, setLastHostId] = useState<string | null>(null)
  const [callHostId, setCallHostId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [voice, setVoiceState] = useState<JarvisVoice>('male')
  const [handsFree, setHandsFreeState] = useState(false)
  const [wake, setWakeState] = useState(false)
  const { phase } = useSyncExternalStore(call.subscribe, call.getSnapshot)
  const live = phase !== 'idle' && phase !== 'error'
  const xeno = useXenoHosts()
  const routeHostId = hostIdFromPath(pathname)
  const { hostId, needsPick } = chooseXenoHost({
    routeHostId,
    lastHostId,
    callHostId,
    reachable: xeno.reachable
  })
  const host = xeno.hosts.find((profile) => profile.id === hostId) ?? null
  const offerUrl = host ? jarvisOfferUrl(host.endpoint) : null
  const reachable = hostId && xeno.checked ? xeno.reachable.has(hostId) : null
  // A call stays on the desktop it started on, wherever you go meanwhile.
  const chosenRef = useRef(hostId)
  chosenRef.current = hostId
  useEffect(() => {
    setCallHostId((held) => (live ? (held ?? chosenRef.current) : null))
  }, [live])
  // Going into a desktop with Xeno running makes it the one to use from the app's own screens.
  useEffect(() => {
    if (routeHostId && !live && xeno.reachable.has(routeHostId)) {
      setLastHostId(routeHostId)
      void rememberJarvisHost(routeHostId)
    }
  }, [routeHostId, live, xeno.reachable])

  useEffect(() => {
    void loadJarvisHost().then(setLastHostId)
    void loadJarvisVoice().then(setVoiceState)
    void loadJarvisHandsFree().then((on) => {
      setHandsFreeState(on)
      call.setHandsFree(on)
    })
    void loadJarvisWake().then((on) => {
      setWakeState(on)
      call.setWake(on)
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
  const setWake = useCallback(
    (on: boolean) => {
      setWakeState(on)
      call.setWake(on)
      void saveJarvisWake(on)
    },
    [call]
  )
  const adoptHost = useCallback((next: string) => {
    setLastHostId(next)
    void rememberJarvisHost(next)
  }, [])
  const pickHost = useMemo(() => (needsPick ? () => setPicking(true) : null), [needsPick])
  // The Action Button, or "Talk to Xeno" in Shortcuts and Siri: a press starts talking, the next one sends.
  const actionPress = useRef(() => {})
  // A press that launched the app waits for the first look at which desktops run Xeno.
  const [pendingPress, setPendingPress] = useState(false)
  actionPress.current = () => {
    if (!xeno.checked) {
      setPendingPress(true)
      return
    }
    const action = actionButtonPress({
      holding: call.getSnapshot().holding,
      canPick: needsPick,
      canTalk: offerUrl !== null
    })
    if (action === 'release') {
      call.releaseTalk()
    } else if (action === 'pick') {
      setPicking(true)
    } else if (action === 'press' && offerUrl) {
      call.pressTalk(offerUrl, voice)
    }
  }
  useEffect(() => {
    if (!OrcaXenoTalk) {
      return
    }
    const take = (): void => {
      if (OrcaXenoTalk?.takePending()) {
        actionPress.current()
      }
    }
    take() // a press that launched the app
    const talk = OrcaXenoTalk.addListener('onTalk', () => actionPress.current())
    const active = AppState.addEventListener('change', (state) => state === 'active' && take())
    return () => {
      talk.remove()
      active.remove()
    }
  }, [])
  useEffect(() => {
    if (pendingPress && xeno.checked) {
      setPendingPress(false)
      actionPress.current()
    }
  }, [pendingPress, xeno.checked])
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
      wake,
      setWake,
      hostName: host?.name ?? null,
      pickHost,
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
      wake,
      setWake,
      host,
      pickHost,
      adoptHost,
      openJarvisScreen
    ]
  )
  // The rail draws outside this provider, so its orb carries the context with it.
  const strip = useSideRailStrip()
  const onJarvisScreen = pathname.endsWith('/jarvis')
  const railOrb = useMemo(
    () =>
      strip &&
      railOrbVisible({
        hasStrip: true,
        hasHost: needsPick || live || reachable === true,
        onJarvisScreen
      }) ? (
        <JarvisContext.Provider value={value}>
          <JarvisRailOrb stripWidth={strip.width} />
        </JarvisContext.Provider>
      ) : null,
    [strip, needsPick, live, reachable, value, onJarvisScreen]
  )
  useSideRailPinned(railOrb)
  const showBubble = bubbleVisible({
    live,
    reachable: needsPick || reachable,
    onJarvisScreen,
    railAvailable: railOrb !== null
  })
  return (
    <JarvisContext.Provider value={value}>
      {children}
      {showBubble ? <JarvisBubble /> : null}
      <JarvisHostPicker
        visible={picking}
        hosts={xeno.hosts.filter((profile) => xeno.reachable.has(profile.id))}
        onPick={adoptHost}
        onClose={() => setPicking(false)}
      />
    </JarvisContext.Provider>
  )
}
