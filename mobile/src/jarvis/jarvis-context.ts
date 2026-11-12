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
  readonly handsFree: boolean
  readonly setHandsFree: (on: boolean) => void
  readonly wake: boolean
  readonly setWake: (on: boolean) => void
  readonly adoptHost: (hostId: string) => void
  readonly openJarvisScreen: () => void
}

export const JarvisContext = createContext<JarvisContextValue | null>(null)

export function useJarvis(): JarvisContextValue {
  const value = useContext(JarvisContext)
  if (!value) {
    throw new Error('useJarvis needs a JarvisProvider above it')
  }
  return value
}
