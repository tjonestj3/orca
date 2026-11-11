import { describe, expect, it } from 'vitest'
import { IDLE_JARVIS_CALL, reduceJarvisMessage, type JarvisCallState } from './jarvis-call-state'

const rtvi = (type: string, data?: object) => ({ label: 'rtvi-ai', type, data })

function run(...messages: unknown[]): JarvisCallState {
  return messages.reduce<JarvisCallState>((state, message) => reduceJarvisMessage(state, message), {
    ...IDLE_JARVIS_CALL,
    phase: 'listening'
  })
}

describe('reduceJarvisMessage', () => {
  it('follows a turn from hearing you to Jarvis speaking and back to listening', () => {
    const state = run(
      rtvi('user-started-speaking'),
      rtvi('user-transcription', { text: ' Anything waiting on me? ', final: true }),
      rtvi('user-stopped-speaking'),
      rtvi('bot-llm-started'),
      rtvi('bot-started-speaking'),
      rtvi('bot-tts-text', { text: 'Yes, one thing.' }),
      rtvi('bot-tts-text', { text: 'Audio polish needs you.' }),
      rtvi('bot-llm-stopped'),
      rtvi('bot-stopped-speaking')
    )
    expect(state).toEqual({
      phase: 'listening',
      composing: false,
      heard: 'Anything waiting on me?',
      said: 'Yes, one thing. Audio polish needs you.'
    })
  })

  it('stays thinking between sentences while Jarvis is still composing', () => {
    expect(
      run(rtvi('bot-llm-started'), rtvi('bot-started-speaking'), rtvi('bot-stopped-speaking')).phase
    ).toBe('thinking')
  })

  it('clears what Jarvis said when you start talking, and ignores interim words and other traffic', () => {
    const state = run(
      rtvi('bot-tts-text', { text: 'Old reply.' }),
      rtvi('user-started-speaking'),
      rtvi('user-transcription', { text: 'half a', final: false }),
      { label: 'something-else', type: 'bot-started-speaking' },
      'ping'
    )
    expect(state).toEqual({ phase: 'hearing', composing: false, heard: '', said: '' })
  })
})
