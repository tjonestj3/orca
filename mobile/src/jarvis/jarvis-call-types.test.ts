import { describe, expect, it } from 'vitest'
import { reduceJarvisMessage, RTVI_LABEL } from './jarvis-call-state'
import {
  IDLE_SNAPSHOT,
  JARVIS_IDLE_HANG_UP_MS,
  JARVIS_WAKE_IDLE_HANG_UP_MS,
  jarvisIdleHangUpMs,
  jarvisOrbPhase,
  type JarvisCallSnapshot
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

describe('jarvisOrbPhase', () => {
  const listening: JarvisCallSnapshot = { ...IDLE_SNAPSHOT, phase: 'listening' }
  const server = (state: JarvisCallSnapshot, type: string, data?: object): JarvisCallSnapshot => ({
    ...state,
    ...reduceJarvisMessage(
      state,
      { label: RTVI_LABEL, type, data },
      { waitingForName: state.wake && !state.holding && !state.heldTurn }
    )
  })

  it('shows Xeno hearing you the moment you press, before the desktop has heard a sound', () => {
    expect(jarvisOrbPhase({ ...listening, holding: true })).toBe('hearing')
    expect(jarvisOrbPhase({ ...listening, phase: 'speaking', holding: true })).toBe('hearing')
  })

  it('looks the same for "Hey Xeno" as for holding', () => {
    const named = server(server(listening, 'user-started-speaking'), 'server-message', {
      type: 'jarvis-hearing',
      route: 'name'
    })
    expect(jarvisOrbPhase(named)).toBe('hearing')
    expect(jarvisOrbPhase({ ...listening, holding: true })).toBe(jarvisOrbPhase(named))
  })

  it('stays listening while people talk without the name, then thinks once a request is taken', () => {
    const chatter = server(listening, 'user-started-speaking')
    expect(jarvisOrbPhase(chatter)).toBe('listening')
    const taken = server(chatter, 'server-message', { type: 'jarvis-woke' })
    expect(jarvisOrbPhase(taken)).toBe('thinking')
  })

  it('thinks once you let go and the desktop says your turn is over', () => {
    const held = server({ ...listening, holding: true, heldTurn: true }, 'user-started-speaking')
    const letGo = { ...held, holding: false }
    expect(jarvisOrbPhase(letGo)).toBe('hearing')
    expect(jarvisOrbPhase(server(letGo, 'user-stopped-speaking'))).toBe('thinking')
  })

  it('shows connecting while a press is still starting the call, and nothing when there is no call', () => {
    expect(jarvisOrbPhase({ ...IDLE_SNAPSHOT, phase: 'connecting', holding: true })).toBe(
      'connecting'
    )
    expect(jarvisOrbPhase({ ...IDLE_SNAPSHOT, holding: true })).toBe('idle')
    expect(jarvisOrbPhase({ ...IDLE_SNAPSHOT, phase: 'error', holding: true })).toBe('error')
  })
})
