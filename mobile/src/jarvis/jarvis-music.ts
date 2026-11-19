import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

/**
 * Music from other apps keeps playing through a call, at its own volume, with Xeno over it. On unless switched off
 * on the Xeno screen.
 *
 * It isn't turned down while Xeno talks. iOS ducks other apps' audio for as long as the ducking app's audio
 * session stays active, and a call's session stays active until it hangs up (deactivating it would stop the
 * microphone), so once Xeno had ducked it the music stayed quiet for the rest of the call (Nov 19: YouTube still
 * quiet after Xeno finished, though the app had asked iOS to bring it back up each time and iOS said it had).
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
