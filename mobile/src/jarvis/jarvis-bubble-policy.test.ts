import { describe, expect, it } from 'vitest'
import { bubbleVisible, classifyBubbleRelease } from './jarvis-bubble-policy'

describe('classifyBubbleRelease', () => {
  it('treats a quick press as a tap and anything held as talk', () => {
    expect(classifyBubbleRelease(120)).toBe('tap')
    expect(classifyBubbleRelease(250)).toBe('talk')
    expect(classifyBubbleRelease(900)).toBe('talk')
  })
})

describe('bubbleVisible', () => {
  const away = { onJarvisScreen: false, railAvailable: false }

  it('stays up during a live call even when the list check fails', () => {
    expect(bubbleVisible({ live: true, reachable: false, ...away })).toBe(true)
  })

  it('shows before a call only once Jarvis is known to be reachable', () => {
    expect(bubbleVisible({ live: false, reachable: true, ...away })).toBe(true)
    expect(bubbleVisible({ live: false, reachable: null, ...away })).toBe(false)
    expect(bubbleVisible({ live: false, reachable: false, ...away })).toBe(false)
  })

  it('never shows on the Jarvis screen or when the folded rail holds Jarvis', () => {
    expect(
      bubbleVisible({ live: true, reachable: true, onJarvisScreen: true, railAvailable: false })
    ).toBe(false)
    expect(
      bubbleVisible({ live: true, reachable: true, onJarvisScreen: false, railAvailable: true })
    ).toBe(false)
  })
})
