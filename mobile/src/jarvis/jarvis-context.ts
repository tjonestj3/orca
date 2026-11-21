import { createContext, useContext } from 'react'
import type { JarvisCall } from './jarvis-call'
import type { JarvisVoice } from './jarvis-voice-preference'

export type JarvisContextValue = {
  readonly call: JarvisCall
  readonly hostId: string | null
  readonly offerUrl: string | null
  // null until the first check; false while the computer's Jarvis can't be reached.
  readonly reachable: boolean | null
  readonly voice: JarvisVoice
  readonly setVoice: (voice: JarvisVoice) => void
  // The desktop being talked to, shown so it's never in doubt.
  readonly hostName: string | null
  // Set while several desktops run Xeno and none was picked yet: a press asks which instead of talking.
  readonly pickHost: (() => void) | null
  readonly adoptHost: (hostId: string) => void
  readonly openJarvisScreen: () => void
  // Whether Xeno's floating orb shows on this screen (not on Home, the Xeno screens or beside the rail's): a
  // desktop page's screen draws its own (PageOrb) when it does.
  readonly orbShown: boolean
}

export const JarvisContext = createContext<JarvisContextValue | null>(null)

export function useJarvis(): JarvisContextValue {
  const value = useContext(JarvisContext)
  if (!value) {
    throw new Error('useJarvis needs a JarvisProvider above it')
  }
  return value
}
