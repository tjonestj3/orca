import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

/**
 * "Hey Xeno": during a call the microphone stays open and Xeno answers when named (or talked over). Off, it's push
 * to talk: the microphone opens only while the orb is held, or between two runs of the Talk to Xeno shortcut
 * (Back Tap, the Action Button), and an idle call hangs up after ten minutes rather than an hour. On unless
 * switched off on the Xeno screen.
 */
const HEY_XENO_KEY = 'orca:jarvisHeyXeno'
export const DEFAULT_HEY_XENO = true

function createHeyXenoPreference() {
  let on = DEFAULT_HEY_XENO
  const listeners = new Set<() => void>()
  void AsyncStorage.getItem(HEY_XENO_KEY)
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
      void AsyncStorage.setItem(HEY_XENO_KEY, next ? 'on' : 'off').catch(() => {})
    }
  }
}

export const heyXeno = createHeyXenoPreference()

export function useHeyXeno(): boolean {
  return useSyncExternalStore(heyXeno.subscribe, heyXeno.read)
}
