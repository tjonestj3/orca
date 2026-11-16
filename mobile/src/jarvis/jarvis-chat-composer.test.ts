import { describe, expect, it } from 'vitest'
import { chatComposerButton } from './jarvis-chat-composer'

describe('chatComposerButton', () => {
  it('sends what was typed, stops Xeno while it answers, and waits on a send in flight', () => {
    expect(chatComposerButton({ text: 'status?', working: false, sending: false })).toBe('send')
    expect(chatComposerButton({ text: '   ', working: false, sending: false })).toBe('off')
    expect(chatComposerButton({ text: '', working: true, sending: false })).toBe('stop')
    expect(chatComposerButton({ text: 'and auth?', working: true, sending: false })).toBe('send')
    expect(chatComposerButton({ text: 'status?', working: false, sending: true })).toBe('off')
  })
})
