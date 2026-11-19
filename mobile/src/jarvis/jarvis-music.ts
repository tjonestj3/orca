import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import type { JarvisCallSnapshot } from './jarvis-call-types'

/**
 * Music from other apps keeps playing through a call, turned down while Xeno speaks or you hold the orb, the way
 * Maps does it. On unless switched off on the Xeno screen.
 */
const MUSIC_KEY = 'orca:jarvisMusicUnderXeno'
export const DEFAULT_MUSIC_UNDER_XENO = true

function createMusicPreference() {
  let on = DEFAULT_MUSIC_UNDER_XENO
  const listeners = new Set<() => void>()
  void AsyncStorage.getItem(MUSIC_KEY)
    .then((stored) => {
      if (stored !== null && (stored === 'on') !== on) {
        on = stored === 'on'
        listeners.forEach((listener) => listener())
      }
    })
    .catch(() => {})
  return {
    read: () => on,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(next: boolean): void {
      on = next
      listeners.forEach((listener) => listener())
      void AsyncStorage.setItem(MUSIC_KEY, next ? 'on' : 'off').catch(() => {})
    }
  }
}

export const musicUnderXeno = createMusicPreference()

export function useMusicUnderXeno(): boolean {
  return useSyncExternalStore(musicUnderXeno.subscribe, musicUnderXeno.read)
}

/** How long after Xeno stops before the music comes back up: past the gap between two of its sentences. */
export const MUSIC_BACK_AFTER_MS = 1500

/** Turns the music down while Xeno speaks or the orb is held, and back up a moment after. */
export class MusicDucker {
  private down = false
  private back: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly duck: (on: boolean) => void) {}

  follow(call: Pick<JarvisCallSnapshot, 'phase' | 'holding'>): void {
    if (call.phase === 'speaking' || call.holding) {
      this.cancelBack()
      if (!this.down) {
        this.down = true
        this.duck(true)
      }
    } else if (this.down && this.back === null) {
      this.back = setTimeout(() => {
        this.back = null
        this.down = false
        this.duck(false)
      }, MUSIC_BACK_AFTER_MS)
    }
  }

  stop(): void {
    this.cancelBack()
    if (this.down) {
      this.down = false
      this.duck(false)
    }
  }

  private cancelBack(): void {
    if (this.back !== null) {
      clearTimeout(this.back)
      this.back = null
    }
  }
}
