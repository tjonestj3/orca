import { describe, expect, it } from 'vitest'
import { agentOf, agentStates, callActionOf, callActivity, widgetAccess } from './jarvis-widgets'

describe("the call's Live Activity", () => {
  it('follows a live call: its phase, what Xeno heard, whether talk is held', () => {
    expect(
      callActivity({ phase: 'hearing', heard: ' set the hold to 0.1 ', holding: true, host: 'Studio' })
    ).toEqual({ phase: 'hearing', heard: 'set the hold to 0.1', holding: true, host: 'Studio' })
  })

  it('ends with the call, or when it fails', () => {
    for (const phase of ['idle', 'error'] as const) {
      expect(callActivity({ phase, heard: 'left over', holding: true, host: null })).toEqual({
        phase: null,
        heard: '',
        holding: false,
        host: 'Desktop'
      })
    }
  })

  it('keeps the end of a long request, which is what fits on the lock screen', () => {
    const heard = `${'word '.repeat(60)}and the last bit`
    const shown = callActivity({ phase: 'thinking', heard, holding: false, host: 'Studio' }).heard
    expect(shown.length).toBeLessThanOrEqual(120)
    expect(shown.startsWith('…')).toBe(true)
    expect(shown.endsWith('and the last bit')).toBe(true)
  })
})

describe("the widgets' access", () => {
  it("points them at the desktop's glance, with the phone's key", () => {
    expect(JSON.parse(widgetAccess('ws://100.126.129.22:6768', 'k1,k2', 'Studio')!)).toEqual({
      glance: 'http://100.126.129.22:7860/api/jarvis/glance',
      key: 'k1,k2',
      host: 'Studio'
    })
  })

  it('without a desktop there is nothing to share', () => {
    expect(widgetAccess(null, 'k', 'Studio')).toBeNull()
    expect(widgetAccess('not a url', 'k', 'Studio')).toBeNull()
  })

  it('before the key is fetched, shares the address with an empty key (Tailscale needs none)', () => {
    expect(JSON.parse(widgetAccess('ws://100.1.2.3:6768', undefined, null)!)).toMatchObject({
      key: '',
      host: 'Desktop'
    })
  })
})

describe('a Live Activity button', () => {
  it('is talk or end; anything else is ignored', () => {
    expect(callActionOf({ action: 'talk' })).toBe('talk')
    expect(callActionOf({ action: 'end' })).toBe('end')
    expect(callActionOf({ action: 'mute' })).toBeNull()
    expect(callActionOf(null)).toBeNull()
  })
})

describe('an agent tapped in the Agents widget', () => {
  it('is its worktree; an empty or missing one is nothing to open', () => {
    expect(agentOf({ worktree: 'repo::/home/me/dev/app' })).toBe('repo::/home/me/dev/app')
    expect(agentOf({ worktree: '' })).toBeNull()
    expect(agentOf({ worktree: 7 })).toBeNull()
    expect(agentOf(null)).toBeNull()
  })
})

describe("the agents' states, for refreshing the widgets", () => {
  it('change when an agent changes state or comes or goes, not when the list reorders', () => {
    const a = { id: 'a', state: 'working' }
    const b = { id: 'b', state: 'done' }
    expect(agentStates([a, b])).toBe(agentStates([b, a]))
    expect(agentStates([a, b])).not.toBe(agentStates([{ ...a, state: 'needs you' }, b]))
    expect(agentStates([a, b])).not.toBe(agentStates([a]))
  })
})
