import { readArtifact, readArtifacts, type JarvisArtifact } from './jarvis-artifacts'
import { readJarvisMessage, type JarvisMessage } from './jarvis-history'

// What the Jarvis screen shows, driven by the voice server's RTVI events on the data channel.
export type JarvisPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'hearing'
  | 'thinking'
  | 'speaking'
  | 'error'

// A worktree the conversation is about, offered as a card that opens it in Orca.
export type JarvisWorktreeCard = {
  readonly id: string
  readonly name: string
  readonly repo: string
  readonly state: string
  readonly isNew: boolean
  // Claude artifacts its agent linked: an Open in Claude button.
  readonly artifacts: readonly JarvisArtifact[]
}

export type JarvisCallState = {
  readonly phase: JarvisPhase
  // Jarvis is still composing: between sentences it stays "thinking" rather than "listening".
  readonly composing: boolean
  readonly heard: string
  readonly said: string
  // Newest first, at most MAX_CARDS.
  readonly cards: readonly JarvisWorktreeCard[]
  // What Jarvis said during this call (replies and agent updates), oldest first, to play again.
  readonly messages: readonly JarvisMessage[]
  // "Hey Xeno" mode counted this turn (jarvis-hearing while you talk, jarvis-woke once you stop), until Xeno
  // starts to answer or the server takes it back (jarvis-dropped).
  readonly woke: boolean
  // An artifact Xeno was asked to open in the Claude app; seq makes each request a new one.
  readonly opening: (JarvisArtifact & { readonly seq: number }) | null
}

const MAX_CARDS = 3
const MAX_MESSAGES = 100

// Marks Pipecat's RTVI protocol messages on the data channel; never shown.
export const RTVI_LABEL = 'rtvi-ai'

export const IDLE_JARVIS_CALL: JarvisCallState = {
  phase: 'idle',
  composing: false,
  heard: '',
  said: '',
  cards: [],
  messages: [],
  woke: false,
  opening: null
}

type RtviMessage = {
  label?: unknown
  type?: unknown
  data?: {
    text?: unknown
    final?: unknown
    type?: unknown
    new?: unknown
    worktree?: unknown
    message?: unknown
    url?: unknown
  }
}

function readCard(data: RtviMessage['data']): JarvisWorktreeCard | null {
  const worktree = data?.worktree as Record<string, unknown> | undefined
  if (
    data?.type !== 'jarvis-worktree' ||
    !worktree ||
    typeof worktree.id !== 'string' ||
    !worktree.id
  ) {
    return null
  }
  const text = (value: unknown): string => (typeof value === 'string' ? value : '')
  return {
    id: worktree.id,
    name: text(worktree.name) || worktree.id,
    repo: text(worktree.repo),
    state: text(worktree.state),
    isNew: data.new === true,
    artifacts: readArtifacts(worktree.artifacts)
  }
}

// How the orb looks: Xeno hearing a "Hey Xeno" turn gets its own colour, apart from holding the button, and from
// thinking once you stop.
export type JarvisOrbTone = JarvisPhase | 'heard'

export function jarvisOrbTone(state: Pick<JarvisCallState, 'phase' | 'woke'>): JarvisOrbTone {
  return state.woke && state.phase === 'hearing' ? 'heard' : state.phase
}

// With "Hey Xeno" on and the button not held, speech only counts once the server says so (jarvis-hearing, as soon
// as it does), so the screen doesn't react to everyone talking.
export function reduceJarvisMessage(
  state: JarvisCallState,
  raw: unknown,
  options: { readonly waitingForName?: boolean } = {}
): JarvisCallState {
  const message = raw as RtviMessage
  if (!message || message.label !== RTVI_LABEL) {
    return state
  }
  const text = typeof message.data?.text === 'string' ? message.data.text.trim() : ''
  switch (message.type) {
    case 'user-started-speaking':
      return options.waitingForName ? state : { ...state, phase: 'hearing', said: '' }
    case 'user-stopped-speaking':
      return options.waitingForName && !(state.woke && state.phase === 'hearing')
        ? state
        : { ...state, phase: 'thinking' }
    case 'user-transcription':
      return message.data?.final === true && text ? { ...state, heard: text } : state
    case 'bot-llm-started':
      return {
        ...state,
        composing: true,
        phase: state.phase === 'speaking' || state.phase === 'hearing' ? state.phase : 'thinking'
      }
    case 'bot-llm-stopped':
      return { ...state, composing: false }
    case 'bot-started-speaking':
      return { ...state, phase: 'speaking', woke: false }
    case 'bot-stopped-speaking':
      return state.phase === 'speaking'
        ? { ...state, phase: state.composing ? 'thinking' : 'listening' }
        : state
    case 'bot-tts-text':
      return text ? { ...state, said: state.said ? `${state.said} ${text}` : text } : state
    case 'server-message': {
      if (message.data?.type === 'jarvis-hearing') {
        return { ...state, phase: 'hearing', woke: true, said: '' }
      }
      if (message.data?.type === 'jarvis-open-artifact') {
        const artifact = readArtifact(message.data)
        return artifact
          ? { ...state, opening: { ...artifact, seq: (state.opening?.seq ?? 0) + 1 } }
          : state
      }
      if (message.data?.type === 'jarvis-woke') {
        return { ...state, phase: 'thinking', woke: true, said: '' }
      }
      if (message.data?.type === 'jarvis-dropped') {
        return state.woke
          ? { ...state, phase: state.composing ? 'thinking' : 'listening', woke: false }
          : state
      }
      const said =
        message.data?.type === 'jarvis-said' ? readJarvisMessage(message.data.message) : null
      if (said) {
        return {
          ...state,
          messages: [...state.messages.filter((m) => m.id !== said.id), said].slice(-MAX_MESSAGES)
        }
      }
      const card = readCard(message.data)
      return card
        ? {
            ...state,
            cards: [card, ...state.cards.filter((c) => c.id !== card.id)].slice(0, MAX_CARDS)
          }
        : state
    }
    default:
      return state
  }
}
