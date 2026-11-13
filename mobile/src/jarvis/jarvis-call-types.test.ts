import { describe, expect, it } from 'vitest'
import {
  JARVIS_IDLE_HANG_UP_MS,
  JARVIS_WAKE_IDLE_HANG_UP_MS,
  jarvisIdleHangUpMs
} from './jarvis-call-types'

describe('jarvisIdleHangUpMs', () => {
  it('hangs up a forgotten call after ten quiet minutes', () => {
    expect(jarvisIdleHangUpMs({ wake: false })).toBe(JARVIS_IDLE_HANG_UP_MS)
    expect(JARVIS_IDLE_HANG_UP_MS).toBe(10 * 60 * 1000)
  })

  it('waits an hour in Hey Xeno mode, which waits for its name, so the phone can sit locked in a pocket', () => {
    expect(jarvisIdleHangUpMs({ wake: true })).toBe(JARVIS_WAKE_IDLE_HANG_UP_MS)
    expect(JARVIS_WAKE_IDLE_HANG_UP_MS).toBe(60 * 60 * 1000)
  })
})
