import { describe, expect, it } from 'vitest'
import { createFoldedFullScreenStore, extendedColumnSide } from './folded-full-screen'

function memoryStorage(initial: string | null = null) {
  const saved = { value: initial }
  return {
    saved,
    getItem: async () => saved.value,
    setItem: async (_key: string, value: string) => {
      saved.value = value
    }
  }
}

describe('the folded full-screen choice', () => {
  it('is off until set', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    await store.load()
    expect(store.read()).toBe(false)
    expect(store.readDefault()).toBe(false)
  })

  it('remembers the default from Settings across launches', async () => {
    const storage = memoryStorage()
    await createFoldedFullScreenStore(storage).setDefault(true)
    const relaunched = createFoldedFullScreenStore(storage)
    await relaunched.load()
    expect(relaunched.read()).toBe(true)
  })

  it('flips from the session screen without changing the default', async () => {
    const storage = memoryStorage('true')
    const store = createFoldedFullScreenStore(storage)
    await store.load()
    store.toggle()
    expect(store.read()).toBe(false)
    expect(store.readDefault()).toBe(true)
    expect(storage.saved.value).toBe('true')
    store.toggle()
    expect(store.read()).toBe(true)
  })

  it('goes back to the default when Settings changes it', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    await store.load()
    store.toggle()
    expect(store.read()).toBe(true)
    await store.setDefault(false)
    expect(store.read()).toBe(false)
  })

  it('tells listeners when it changes', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    let calls = 0
    store.subscribe(() => calls++)
    store.toggle()
    await store.setDefault(true)
    expect(calls).toBe(2)
  })
})

describe('which side the screens extend over', () => {
  const column = { side: 'right' as const }
  const on = { requested: true, fullScreen: true, column }

  it('is the column side while a session screen asks and full screen is on', () => {
    expect(extendedColumnSide(on)).toBe('right')
  })

  it('is none when any of those is missing', () => {
    expect(extendedColumnSide({ ...on, requested: false })).toBeNull()
    expect(extendedColumnSide({ ...on, fullScreen: false })).toBeNull()
    expect(extendedColumnSide({ ...on, column: null })).toBeNull()
  })
})
