// A live Jarvis call shares the iOS audio session with Orca's chat dictation, so the call ends before dictation sets it up.
import { afterEach, describe, expect, it, vi } from 'vitest'

const device = vi.hoisted(() => ({ calls: new Array<string>() }))

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'ios' }
}))
vi.mock('@orca/expo-two-way-audio', () => ({
  addExpoTwoWayAudioEventListener: () => ({ remove: () => {} }),
  initialize: () => {
    device.calls.push('initialize')
    return Promise.resolve(true)
  },
  requestMicrophonePermissionsAsync: () => Promise.resolve({ granted: true }),
  tearDown: () => device.calls.push('tearDown'),
  toggleRecording: () => true
}))
vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => Promise.resolve(),
  deactivateKeepAwake: () => Promise.resolve()
}))

import { useDictationCapture } from './dictation-capture'
import { onDictationStarting } from './microphone-handoff'

describe('chat dictation and a Jarvis call', () => {
  let stop: (() => void) | null = null
  afterEach(() => {
    stop?.()
    device.calls.length = 0
  })

  it('ends the call before dictation sets up the audio session', async () => {
    stop = onDictationStarting(() => {
      device.calls.push('jarvis call ends')
      return false
    })
    await expect(useDictationCapture().open()).resolves.toEqual({ ok: true })
    expect(device.calls).toEqual(['jarvis call ends', 'initialize'])
  })

  it('gives the ended call a moment to let go of the session first', async () => {
    vi.useFakeTimers()
    try {
      stop = onDictationStarting(() => true)
      const opening = useDictationCapture().open()
      await vi.advanceTimersByTimeAsync(10)
      expect(device.calls).toEqual([])
      await vi.advanceTimersByTimeAsync(500)
      await opening
      expect(device.calls).toEqual(['initialize'])
    } finally {
      vi.useRealTimers()
    }
  })
})
