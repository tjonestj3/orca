import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key)
  }
}))

const { lastRouteHref, loadLastRoute, saveLastRoute } = await import('./last-route')

beforeEach(() => store.clear())

describe('lastRouteHref', () => {
  it('keeps a session path and its non-segment query', () => {
    expect(
      lastRouteHref('/h/host-1/session/global-floating-terminal', {
        hostId: 'host-1',
        worktreeId: 'global-floating-terminal',
        name: 'Floating Workspace'
      })
    ).toBe('/h/host-1/session/global-floating-terminal?name=Floating+Workspace')
  })

  it('remembers nothing outside a host', () => {
    expect(lastRouteHref('/', {})).toBeNull()
    expect(lastRouteHref('/settings', {})).toBeNull()
  })
})

describe('the remembered route', () => {
  it('reopens a recent host screen', async () => {
    await saveLastRoute('/h/host-1/session/wt-1', 1_000)
    expect(await loadLastRoute(2_000)).toBe('/h/host-1/session/wt-1')
  })

  it('starts fresh after a day, or after leaving the host', async () => {
    await saveLastRoute('/h/host-1/session/wt-1', 0)
    expect(await loadLastRoute(25 * 60 * 60 * 1000)).toBeNull()
    await saveLastRoute('/h/host-1/session/wt-1', 0)
    await saveLastRoute(null)
    expect(await loadLastRoute(1)).toBeNull()
  })
})
