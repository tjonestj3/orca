import { describe, expect, it } from 'vitest'
import { chatComposerButton } from './jarvis-chat-composer'

describe('chatComposerButton', () => {
  it('sends attached images with nothing typed, even while Xeno answers', () => {
    const at = { text: '', sending: false, calling: false, images: 1 }
    expect(chatComposerButton({ ...at, working: false })).toBe('send')
    expect(chatComposerButton({ ...at, working: true })).toBe('send')
    expect(chatComposerButton({ ...at, working: false, images: 0 })).toBe('call')
  })

  it('sends what was typed, stops Xeno while it answers, and waits on a send in flight', () => {
    const at = { calling: false, sending: false, working: false }
    expect(chatComposerButton({ ...at, text: 'status?' })).toBe('send')
    expect(chatComposerButton({ ...at, text: '', working: true })).toBe('stop')
    expect(chatComposerButton({ ...at, text: 'and auth?', working: true })).toBe('send')
    expect(chatComposerButton({ ...at, text: 'status?', sending: true })).toBe('off')
  })

  it('with nothing typed, calls Xeno, or hangs up a call that is open', () => {
    const at = { calling: false, sending: false, working: false }
    expect(chatComposerButton({ ...at, text: '   ' })).toBe('call')
    expect(chatComposerButton({ ...at, text: '', calling: true })).toBe('hangUp')
    expect(chatComposerButton({ ...at, text: 'hi', calling: true })).toBe('send')
    // Stopping a reply comes first; the call can still be hung up from the bubble.
    expect(chatComposerButton({ ...at, text: '', calling: true, working: true })).toBe('stop')
  })
})
