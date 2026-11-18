import { describe, expect, it, vi } from 'vitest'
import { XenoKeys, pairIfNeeded, withXenoKey } from './jarvis-key'

function memoryStore(initial: string | null = null) {
  let saved = initial
  return {
    read: async () => saved,
    write: async (value: string) => {
      saved = value
    },
    saved: () => saved
  }
}

describe('XenoKeys', () => {
  it('sends no key until it has one, then every key it has', async () => {
    const store = memoryStore()
    const keys = new XenoKeys(store)
    await keys.load()
    expect(keys.headers()).toEqual({})
    await keys.remember('k1')
    await keys.remember('k2')
    await keys.remember('k1')
    expect(keys.headers()).toEqual({ 'X-Xeno-Key': 'k1,k2' }) // newest first, once each
    expect(JSON.parse(store.saved() ?? '[]')).toEqual(['k1', 'k2'])
  })

  it('keeps what it saved across launches, and shrugs off a damaged store', async () => {
    const keys = new XenoKeys(memoryStore('["saved"]'))
    await keys.load()
    expect(keys.headers()).toEqual({ 'X-Xeno-Key': 'saved' })
    const broken = new XenoKeys(memoryStore('not json'))
    await broken.load()
    expect(broken.headers()).toEqual({})
  })

  it('keeps only the newest few keys', async () => {
    const keys = new XenoKeys(memoryStore())
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      await keys.remember(key)
    }
    expect(keys.headers()['X-Xeno-Key']).toBe('f,e,d,c,b')
  })
})

describe('withXenoKey', () => {
  it('adds the key to a request, keeping its own headers', () => {
    expect(
      withXenoKey(
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { 'X-Xeno-Key': 'k' }
      )
    ).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Xeno-Key': 'k' }
    })
    expect(withXenoKey(undefined, {})).toEqual({ headers: {} })
  })
})

describe('pairIfNeeded', () => {
  it('fetches the key when Xeno says this request came without it, and keeps it', async () => {
    const keys = new XenoKeys(memoryStore())
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ key: 'from-xeno' }), { status: 200 })
    )
    await pairIfNeeded({ ok: true, key: false }, 'http://h:7860/api/jarvis/pair', keys, fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(keys.headers()).toEqual({ 'X-Xeno-Key': 'from-xeno' })
  })

  it('leaves it alone when the key came along, or Xeno is older, or it refuses', async () => {
    const keys = new XenoKeys(memoryStore())
    const fetcher = vi.fn(async () => new Response('no', { status: 403 }))
    await pairIfNeeded({ ok: true, key: true }, 'u', keys, fetcher)
    await pairIfNeeded({ ok: true }, 'u', keys, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
    await pairIfNeeded({ ok: true, key: false }, 'u', keys, fetcher)
    expect(keys.headers()).toEqual({})
  })
})
