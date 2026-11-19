import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  actionButtonPress,
  bubblePress,
  bubbleVisible,
  classifyBubbleRelease,
  railOrbSize,
  railOrbVisible,
  sessionOrbPlace
} from './jarvis-bubble-policy'

describe('classifyBubbleRelease', () => {
  it('treats a quick press as a tap and anything held as talk', () => {
    expect(classifyBubbleRelease(120)).toBe('tap')
    expect(classifyBubbleRelease(250)).toBe('talk')
    expect(classifyBubbleRelease(900)).toBe('talk')
  })
})

describe('bubbleVisible', () => {
  const away = { onJarvisScreen: false, onXenoChat: false, railAvailable: false }

  it('stays up during a live call even when the list check fails', () => {
    expect(bubbleVisible({ live: true, reachable: false, ...away })).toBe(true)
  })

  it('shows before a call only once Jarvis is known to be reachable', () => {
    expect(bubbleVisible({ live: false, reachable: true, ...away })).toBe(true)
    expect(bubbleVisible({ live: false, reachable: null, ...away })).toBe(false)
    expect(bubbleVisible({ live: false, reachable: false, ...away })).toBe(false)
  })

  it('never shows on the Jarvis screen or when the folded rail holds Jarvis', () => {
    expect(bubbleVisible({ live: true, reachable: true, ...away, onJarvisScreen: true })).toBe(
      false
    )
    expect(bubbleVisible({ live: true, reachable: true, ...away, railAvailable: true })).toBe(false)
  })

  it('never shows over the Xeno chat, whose composer has its own call button', () => {
    expect(bubbleVisible({ live: true, reachable: true, ...away, onXenoChat: true })).toBe(false)
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

describe('actionButtonPress', () => {
  it('starts talking, then sends on the next press, like holding and letting go', () => {
    expect(actionButtonPress({ holding: false, canPick: false, canTalk: true })).toBe('press')
    expect(actionButtonPress({ holding: true, canPick: false, canTalk: true })).toBe('release')
  })

  it('asks which desktop first when several run Xeno, and does nothing with none', () => {
    expect(actionButtonPress({ holding: false, canPick: true, canTalk: false })).toBe('pick')
    expect(actionButtonPress({ holding: false, canPick: false, canTalk: false })).toBeNull()
  })
})

describe('the small Xeno orb in a session', () => {
  // The iPhone Duo's cover screen, from screenshots: 34 pt home inset, the composer's mic 91 pt from the right edge
  // and 75 pt up, the terminal's last line (Claude Code's status) 161 pt up.
  const at = { insetsBottom: 34, keyboard: 0, rightEdge: 0 }

  it('sits in the chat composer, just left of the mic, with the desktop name to its left', () => {
    expect(sessionOrbPlace({ ...at, view: 'chat' })).toEqual({ bottom: 61, right: 115, size: 28 })
  })

  it('rides up with the keyboard, as the composer does', () => {
    expect(sessionOrbPlace({ ...at, keyboard: 300, view: 'chat' }).bottom).toBe(327)
  })

  it('ends the terminal’s last line, clear of the keys and the input below it', () => {
    expect(sessionOrbPlace({ ...at, view: 'terminal' })).toEqual({
      bottom: 147,
      right: 8,
      size: 28
    })
  })

  it('keeps to the screen beside a side inset', () => {
    expect(sessionOrbPlace({ ...at, rightEdge: 47, view: 'chat' }).right).toBe(162)
  })
})
