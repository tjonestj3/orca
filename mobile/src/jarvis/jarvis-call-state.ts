// What the Jarvis screen shows, driven by the voice server's RTVI events on the data channel.
export type JarvisPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'hearing'
  | 'thinking'
  | 'speaking'
  | 'error'

export type JarvisCallState = {
  readonly phase: JarvisPhase
  // Jarvis is still composing: between sentences it stays "thinking" rather than "listening".
  readonly composing: boolean
  readonly heard: string
  readonly said: string
}

// Marks Pipecat's RTVI protocol messages on the data channel; never shown.
export const RTVI_LABEL = 'rtvi-ai'

export const IDLE_JARVIS_CALL: JarvisCallState = {
  phase: 'idle',
  composing: false,
  heard: '',
  said: ''
}

type RtviMessage = { label?: unknown; type?: unknown; data?: { text?: unknown; final?: unknown } }

export function reduceJarvisMessage(state: JarvisCallState, raw: unknown): JarvisCallState {
  const message = raw as RtviMessage
  if (!message || message.label !== RTVI_LABEL) {
    return state
  }
  const text = typeof message.data?.text === 'string' ? message.data.text.trim() : ''
  switch (message.type) {
    case 'user-started-speaking':
      return { ...state, phase: 'hearing', said: '' }
    case 'user-stopped-speaking':
      return { ...state, phase: 'thinking' }
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
      return { ...state, phase: 'speaking' }
    case 'bot-stopped-speaking':
      return state.phase === 'speaking'
        ? { ...state, phase: state.composing ? 'thinking' : 'listening' }
        : state
    case 'bot-tts-text':
      return text ? { ...state, said: state.said ? `${state.said} ${text}` : text } : state
    default:
      return state
  }
}
