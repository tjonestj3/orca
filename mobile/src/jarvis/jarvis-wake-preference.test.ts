import { describe, expect, it, vi } from 'vitest'

const stored = new Map<string, string>()
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => stored.get(key) ?? null,
    setItem: async (key: string, value: string) => void stored.set(key, value)
  }
}))

const { heyXeno, DEFAULT_HEY_XENO } = await import('./jarvis-wake-preference')

describe('Hey Xeno or push to talk', () => {
  it('is Hey Xeno unless switched off, and the switch is kept and announced', () => {
    expect(DEFAULT_HEY_XENO).toBe(true)
    expect(heyXeno.read()).toBe(true)
    const told = vi.fn()
    const stop = heyXeno.subscribe(told)
    heyXeno.set(false)
    expect(heyXeno.read()).toBe(false)
    expect(told).toHaveBeenCalledTimes(1)
    expect(stored.get('orca:jarvisHeyXeno')).toBe('off')
    stop()
    heyXeno.set(true)
    expect(told).toHaveBeenCalledTimes(1)
  })
})
