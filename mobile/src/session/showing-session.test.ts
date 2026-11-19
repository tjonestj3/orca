import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))

const { createShowingSessionStore } = await import('./showing-session')

describe('whether a session is showing', () => {
  it('is while any screen showing one holds it, the host list page included', () => {
    const store = createShowingSessionStore()
    expect(store.read()).toBe(false)
    const hostListPage = store.show()
    expect(store.read()).toBe(true)
    const sessionRoute = store.show()
    hostListPage()
    expect(store.read()).toBe(true)
    sessionRoute()
    expect(store.read()).toBe(false)
  })

  it('counts a release once, however often it is called', () => {
    const store = createShowingSessionStore()
    const other = store.show()
    const release = store.show()
    release()
    release()
    expect(store.read()).toBe(true)
    other()
  })

  it('tells listeners when it changes', () => {
    const store = createShowingSessionStore()
    let told = 0
    store.subscribe(() => (told += 1))
    store.show()()
    expect(told).toBe(2)
  })
})
