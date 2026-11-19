import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))

const { createShowingSessionStore } = await import('./showing-session')

describe('which session view is showing', () => {
  it('is none until a screen showing a session holds it, the host list page included', () => {
    const store = createShowingSessionStore()
    expect(store.read()).toBeNull()
    const hostListPage = store.show('chat')
    expect(store.read()).toBe('chat')
    hostListPage()
    expect(store.read()).toBeNull()
  })

  it('is the view of the screen that took it last', () => {
    const store = createShowingSessionStore()
    const below = store.show('chat')
    const above = store.show('terminal')
    expect(store.read()).toBe('terminal')
    above()
    expect(store.read()).toBe('chat')
    below()
  })

  it('counts a release once, however often it is called', () => {
    const store = createShowingSessionStore()
    const other = store.show('chat')
    const release = store.show('terminal')
    release()
    release()
    expect(store.read()).toBe('chat')
    other()
  })

  it('tells listeners when it changes', () => {
    const store = createShowingSessionStore()
    let told = 0
    store.subscribe(() => (told += 1))
    store.show('chat')()
    expect(told).toBe(2)
  })
})
