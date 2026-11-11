import { IDLE_JARVIS_CALL, type JarvisCallState } from './jarvis-call-state'

// The shapes a Jarvis call reports to the screen, and its resting values.
export type JarvisCallError = 'microphone' | 'unreachable' | 'dropped' | 'idle' | 'dictation'

// What a call opened by a tap starts with instead of the greeting.
export type JarvisOpening = { readonly ask?: string; readonly replay?: number | 'last' }

export type JarvisCallSnapshot = JarvisCallState & {
  // Hands-free listens all the time; otherwise only while a talk control is held.
  readonly handsFree: boolean
  readonly holding: boolean
  readonly error: JarvisCallError | null
}

// A forgotten call hangs up after this long with neither side speaking.
export const JARVIS_IDLE_HANG_UP_MS = 10 * 60 * 1000
export const IDLE_CHECK_MS = 15_000

// 0..1, roughly how loud each side sounds; drives the orb.
export type JarvisLevels = { readonly user: number; readonly bot: number }

export const IDLE_SNAPSHOT: JarvisCallSnapshot = {
  ...IDLE_JARVIS_CALL,
  handsFree: false,
  holding: false,
  error: null
}
export const QUIET: JarvisLevels = { user: 0, bot: 0 }
