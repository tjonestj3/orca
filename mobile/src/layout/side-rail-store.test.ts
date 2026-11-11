import { describe, expect, it } from 'vitest'
import { createRailStore } from './side-rail-store'

describe('side rail store', () => {
  it('keeps a pinned control alongside whatever the current screen shows', () => {
    const store = createRailStore()
    const screen = Symbol('screen')
    store.pin('jarvis')
    store.show(screen, 'arrow keys')
    expect(store.readPinned()).toBe('jarvis')
    expect(store.read()?.node).toBe('arrow keys')
  })

  it('keeps the pin when the screen leaves, and unpinning leaves the screen alone', () => {
    const store = createRailStore()
    const screen = Symbol('screen')
    store.pin('jarvis')
    store.show(screen, 'arrow keys')
    store.hide(screen)
    expect(store.readPinned()).toBe('jarvis')
    store.show(screen, 'arrow keys')
    store.pin(null)
    expect(store.readPinned()).toBeNull()
    expect(store.read()?.node).toBe('arrow keys')
  })

  it('tells listeners when the pin changes', () => {
    const store = createRailStore()
    let calls = 0
    store.subscribe(() => calls++)
    store.pin('jarvis')
    store.pin(null)
    expect(calls).toBe(2)
  })
})
