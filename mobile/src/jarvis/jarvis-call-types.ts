import { IDLE_JARVIS_CALL, type JarvisCallState } from './jarvis-call-state'

// The shapes a Jarvis call reports to the screen, and its resting values.
export type JarvisCallError = 'microphone' | 'unreachable' | 'dropped' | 'idle' | 'dictation'

// What a call opened by a tap starts with instead of the greeting.
export type JarvisOpening = { readonly ask?: string; readonly replay?: number | 'last' }

export type JarvisCallSnapshot = JarvisCallState & {
  // "Hey Xeno": the mic stays open and Xeno answers when it hears its name. Always on: the Hands-free and
  // Hey Xeno switches are gone, and holding a talk control or the Action Button needs no name.
  readonly wake: boolean
  readonly holding: boolean
  readonly error: JarvisCallError | null
}

// A forgotten call hangs up after this long with neither side speaking.
export const JARVIS_IDLE_HANG_UP_MS = 10 * 60 * 1000
// "Hey Xeno" waits for its name, often with the phone locked in a pocket, so it waits longer.
export const JARVIS_WAKE_IDLE_HANG_UP_MS = 60 * 60 * 1000

export function jarvisIdleHangUpMs(s: { readonly wake: boolean }): number {
  return s.wake ? JARVIS_WAKE_IDLE_HANG_UP_MS : JARVIS_IDLE_HANG_UP_MS
}
export const IDLE_CHECK_MS = 15_000

// 0..1, roughly how loud each side sounds; drives the orb.
export type JarvisLevels = { readonly user: number; readonly bot: number }

export const IDLE_SNAPSHOT: JarvisCallSnapshot = {
  ...IDLE_JARVIS_CALL,
  wake: true,
  holding: false,
  error: null
}
export const QUIET: JarvisLevels = { user: 0, bot: 0 }
