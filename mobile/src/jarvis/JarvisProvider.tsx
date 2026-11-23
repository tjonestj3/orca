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
import { useCallResume } from './jarvis-call-interruption'
import { actionButtonPress, bubbleVisible, railOrbVisible } from './jarvis-bubble-policy'
import { JarvisCall } from './jarvis-call'
import { useHeyXeno } from './jarvis-wake-preference'
import { JarvisContext, type JarvisContextValue } from './jarvis-context'
import { JarvisBubble } from './JarvisBubble'
import { JarvisRailOrb } from './JarvisRailOrb'
import { jarvisOfferUrl } from './jarvis-endpoint'
import { xenoKeys } from './jarvis-key'
import { agentOf, callActionOf, callActivity, widgetAccess } from './jarvis-widgets'
import {
  CALL_FOLLOWS_AFTER_MS,
  callMoveTarget,
  chooseXenoHost,
  hostIdFromPath
} from './jarvis-host-choice'
import { JarvisHostPicker } from './JarvisHostPicker'
import { useXenoHosts } from './use-xeno-hosts'
import { loadJarvisHost, rememberJarvisHost } from './jarvis-host-preference'
import { openInClaude } from './jarvis-open-in-claude'
import { subscribeLayoutNotes } from '../layout/layout-notes'
import { viewingTarget } from './jarvis-viewing'
import {
  DEFAULT_JARVIS_VOICE,
  loadJarvisVoice,
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
  const [voice, setVoiceState] = useState<JarvisVoice>(DEFAULT_JARVIS_VOICE)
  const { phase, opening, holding, heard } = useSyncExternalStore(call.subscribe, call.getSnapshot)
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
  useCallResume(call, offerUrl, voice) // after Siri, a phone call or another app took the audio
  const reachable = hostId && xeno.checked ? xeno.reachable.has(hostId) : null
  // A call stays on the desktop it started on, wherever you go meanwhile.
  const chosenRef = useRef(hostId)
  chosenRef.current = hostId
  useEffect(() => {
    setCallHostId((held) => (live ? (held ?? chosenRef.current) : null))
  }, [live])
  // Going into another desktop with Xeno running moves a live call there once you've stayed a moment and its Xeno
  // is only listening: each desktop has its own Xeno, and talking to it while you work there needs the call there.
  const moveTo = callMoveTarget({ live, phase, callHostId, routeHostId, reachable: xeno.reachable })
  // Read when the move happens, so refreshing the desktop list or changing the voice doesn't restart the wait.
  const latest = useRef({ hosts: xeno.hosts, voice })
  latest.current = { hosts: xeno.hosts, voice }
  useEffect(() => {
    if (!moveTo) {
      return
    }
    const to = moveTo
    const follow = setTimeout(() => {
      const target = latest.current.hosts.find((profile) => profile.id === to)
      const url = target ? jarvisOfferUrl(target.endpoint) : null
      if (!url) {
        return
      }
      setCallHostId(to)
      setLastHostId(to)
      void rememberJarvisHost(to)
      void call.start(url, latest.current.voice)
    }, CALL_FOLLOWS_AFTER_MS)
    return () => clearTimeout(follow)
  }, [call, moveTo])
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
  }, [])
  // "Hey Xeno", or push to talk (the Xeno screen's switch), live as it changes.
  const wake = useHeyXeno()
  useEffect(() => call.setWake(wake), [call, wake])
  // The Talk to Xeno shortcut runs without opening the app while a call is live; it reads this to know.
  useEffect(() => {
    OrcaXenoTalk?.setTalkState?.(live, holding)
  }, [live, holding])
  useEffect(() => call.setViewing(viewingTarget(pathname, hostId)), [call, pathname, hostId])
  // The call on the lock screen and in the Dynamic Island; with no call (as when the app starts) it ends any left.
  const hostName = host?.name ?? null
  useEffect(() => {
    const activity = callActivity({ phase, heard, holding, host: hostName })
    OrcaXenoTalk?.setCallActivity?.(activity.phase, activity.heard, activity.holding, activity.host)
  }, [phase, heard, holding, hostName])
  // Xeno's widgets fetch the desktop's glance themselves: they get its address and the key here, again each time
  // the app comes to the front (the key may have arrived meanwhile), and are asked to refresh then too.
  const endpoint = host?.endpoint ?? null
  useEffect(() => {
    if (!endpoint || !OrcaXenoTalk?.shareWidgetAccess) {
      return
    }
    let gone = false
    const share = (): void => {
      void xenoKeys.load().then(() => {
        const access = widgetAccess(endpoint, xenoKeys.headers()['X-Xeno-Key'], hostName)
        if (!gone && access) {
          OrcaXenoTalk?.shareWidgetAccess?.(access)
        }
      })
    }
    share()
    const active = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        share()
        OrcaXenoTalk?.reloadWidgets?.()
      }
    })
    return () => {
      gone = true
      active.remove()
    }
  }, [endpoint, hostName])
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
    const { holding: held, phase: now } = call.getSnapshot()
    const action = actionButtonPress({
      holding: held,
      canPick: needsPick,
      canTalk: offerUrl !== null,
      wake,
      inCall: now !== 'idle' && now !== 'error'
    })
    // For Xeno's server log: what the shortcut found, and what the press did here.
    call.reportDevice({
      kind: 'talk-press',
      action: action ?? 'none',
      trace: OrcaXenoTalk?.takeTrace?.() ?? ''
    })
    if (action === 'release') {
      call.releaseTalk()
    } else if (action === 'pick') {
      setPicking(true)
    } else if (action === 'press' && offerUrl) {
      call.pressTalk(offerUrl, voice)
    } else if (action === 'start' && offerUrl) {
      void call.start(offerUrl, voice)
    }
  }
  useEffect(() => {
    if (!OrcaXenoTalk) {
      return
    }
    const take = (): void => {
      if (OrcaXenoTalk?.takePending()) {
        actionPress.current()
        return
      }
      // A shortcut press that opened the app but never reached it (its continuation didn't run).
      const trace = OrcaXenoTalk?.takeTrace?.()
      if (trace) {
        call.reportDevice({ kind: 'talk-press', action: 'lost', trace })
      }
    }
    take() // a press that launched the app
    const talk = OrcaXenoTalk.addListener('onTalk', () => actionPress.current())
    // The Live Activity's buttons: Talk works like the Action Button, End hangs up.
    const button = OrcaXenoTalk.addListener('onCallAction', (note) => {
      const action = callActionOf(note)
      if (action === 'talk') {
        actionPress.current()
      } else if (action === 'end') {
        call.hangUp()
      }
    })
    const active = AppState.addEventListener('change', (state) => state === 'active' && take())
    return () => {
      talk.remove()
      button.remove()
      active.remove()
    }
  }, [])
  // An agent tapped in the Agents widget: its worktree opens on Xeno's desktop. Only Talk to Xeno starts a call.
  // Held until the desktop is known, as when the tap launched the app.
  const [agentTapped, setAgentTapped] = useState<string | null>(null)
  useEffect(() => {
    if (!OrcaXenoTalk) {
      return
    }
    const take = (): void => {
      const worktree = OrcaXenoTalk?.takeOpenAgent?.()
      if (worktree) {
        setAgentTapped(worktree)
      }
    }
    take() // a tap that launched the app
    const tapped = OrcaXenoTalk.addListener('onOpenAgent', (note) => {
      const worktree = agentOf(note)
      if (worktree) {
        setAgentTapped(worktree)
      }
    })
    const active = AppState.addEventListener('change', (state) => state === 'active' && take())
    return () => {
      tapped.remove()
      active.remove()
    }
  }, [])
  useEffect(() => {
    if (!agentTapped || !hostId) {
      return
    }
    setAgentTapped(null)
    router.push({ pathname: '/h/[hostId]/session/[worktreeId]', params: { hostId, worktreeId: agentTapped } })
  }, [agentTapped, hostId, router])
  // Xeno was asked to open an artifact: open it in the Claude app. Each request is a new object; other updates
  // carry the same one along, so this runs once per request.
  useEffect(() => {
    if (opening) {
      openInClaude(opening.url)
    }
  }, [opening])
  // While a call is live, tell Xeno's server when the phone locks, unlocks or its audio is interrupted.
  useEffect(() => {
    if (!live) {
      return
    }
    const device = OrcaXenoTalk?.addListener('onDevice', (note) => call.reportDevice(note))
    // The window, fold, column and panes as they change, and the last few from before the call (layout-notes).
    const layout = subscribeLayoutNotes((note) => call.reportDevice(note))
    const app = AppState.addEventListener('change', (state) =>
      call.reportDevice({ kind: `app-${state}` })
    )
    return () => {
      device?.remove()
      app.remove()
      layout()
    }
  }, [call, live])
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

  const strip = useSideRailStrip()
  const onJarvisScreen = pathname.endsWith('/jarvis')
  const onHome = pathname === '/' // its tab bar holds Xeno (JarvisTabButton)
  const railShown =
    strip !== null &&
    railOrbVisible({
      hasStrip: true,
      hasHost: needsPick || live || reachable === true,
      onJarvisScreen,
      onHome
    })
  const orbShown = bubbleVisible({
    live,
    reachable: needsPick || reachable,
    onJarvisScreen,
    onXenoChat: pathname.endsWith('/jarvis-transcript'),
    onHome,
    railAvailable: railShown
  })
  const value = useMemo<JarvisContextValue>(
    () => ({
      call,
      hostId,
      offerUrl,
      reachable,
      voice,
      setVoice,
      hostName: host?.name ?? null,
      pickHost,
      adoptHost,
      openJarvisScreen,
      orbShown
    }),
    [
      call,
      hostId,
      offerUrl,
      reachable,
      voice,
      setVoice,
      host,
      pickHost,
      adoptHost,
      openJarvisScreen,
      orbShown
    ]
  )
  // The rail draws outside this provider, so its orb carries the context with it.
  const railOrb = useMemo(
    () =>
      strip && railShown ? (
        <JarvisContext.Provider value={value}>
          <JarvisRailOrb stripWidth={strip.width} />
        </JarvisContext.Provider>
      ) : null,
    [strip, railShown, value]
  )
  useSideRailPinned(railOrb)
  return (
    <JarvisContext.Provider value={value}>
      {children}
      {orbShown ? <JarvisBubble /> : null}
      <JarvisHostPicker
        visible={picking}
        hosts={xeno.hosts.filter((profile) => xeno.reachable.has(profile.id))}
        onPick={adoptHost}
        onClose={() => setPicking(false)}
      />
    </JarvisContext.Provider>
  )
}
