import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bubblePress,
  bubbleVisible,
  classifyBubbleRelease,
  railOrbSize,
  railOrbVisible
} from './jarvis-bubble-policy'

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

describe('bubblePress', () => {
  let did: string[] = []
  let live = false
  const press = () =>
    bubblePress({
      live: () => live,
      pressTalk: () => did.push('pressTalk'),
      releaseTalk: () => did.push('releaseTalk'),
      cancelTalk: () => did.push('cancelTalk'),
      openScreen: () => did.push('openScreen')
    })
  beforeEach(() => {
    vi.useFakeTimers()
    did = []
    live = false
  })
  afterEach(() => vi.useRealTimers())

  it('opens the Jarvis screen on a tap without starting a call', () => {
    const p = press()
    p.pressIn()
    vi.advanceTimersByTime(120)
    p.pressOut()
    vi.advanceTimersByTime(1000)
    expect(did).toEqual(['openScreen'])
  })

  it('starts the call once the press is a hold, and lets go as talk', () => {
    const p = press()
    p.pressIn()
    vi.advanceTimersByTime(300)
    expect(did).toEqual(['pressTalk'])
    p.pressOut()
    expect(did).toEqual(['pressTalk', 'releaseTalk'])
  })

  it('opens the mic at once in a live call, and a tap there shuts it and opens the screen', () => {
    live = true
    const p = press()
    p.pressIn()
    expect(did).toEqual(['pressTalk'])
    vi.advanceTimersByTime(100)
    p.pressOut()
    expect(did).toEqual(['pressTalk', 'cancelTalk', 'openScreen'])
  })

  it('lets go if the control goes away mid-hold, as when the Duo folds', () => {
    const p = press()
    p.pressIn()
    vi.advanceTimersByTime(300)
    p.unmount()
    expect(did).toEqual(['pressTalk', 'releaseTalk'])
    const q = press()
    did = []
    q.pressIn()
    q.unmount()
    vi.advanceTimersByTime(1000)
    expect(did).toEqual([])
  })
})

describe('railOrbSize', () => {
  it('fills the strip on its own, and is the size of a key among the shortcut keys', () => {
    expect(railOrbSize(84, false)).toBe(60)
    expect(railOrbSize(84, true)).toBe(40)
  })
})

describe('railOrbVisible', () => {
  it('shows in the folded rail for a computer, except on the Jarvis screen, which has its own', () => {
    expect(railOrbVisible({ hasStrip: true, hasHost: true, onJarvisScreen: false })).toBe(true)
    expect(railOrbVisible({ hasStrip: true, hasHost: true, onJarvisScreen: true })).toBe(false)
    expect(railOrbVisible({ hasStrip: false, hasHost: true, onJarvisScreen: false })).toBe(false)
    expect(railOrbVisible({ hasStrip: true, hasHost: false, onJarvisScreen: false })).toBe(false)
  })
})
