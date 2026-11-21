import { useEffect, useRef } from 'react'
import {
  Easing,
  runOnUI,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import {
  currentSoftKeyboardHeight,
  subscribeSoftKeyboard
} from '../platform/keyboard/keyboard-occlusion'
import {
  OrbKeyboardRide,
  orbTop,
  RIDE_SLACK_MS,
  SETTLE_MS,
  type OrbBase
} from './orb-keyboard-ride'

/**
 * The orb's top as an animated style, riding with the keyboard frame by frame (orb-keyboard-ride): `top` is where
 * the page last said it goes, or undefined for a spot placed some other way, which the style then leaves alone.
 */
export function useOrbKeyboardRide(top: number | undefined, bottomInset: number) {
  // The keyboard's own position, every frame on the UI thread: the orb moves with it, not after hearing of it.
  const keyboard = useAnimatedKeyboard()
  const base = useSharedValue<OrbBase>({ top: top ?? 0, keyboard: currentSoftKeyboardHeight() })
  // Easing out a guess that was a few points off, once the keyboard is still (0 otherwise).
  const settling = useSharedValue(0)
  const inset = useSharedValue(bottomInset)
  const placed = useSharedValue(top !== undefined)
  const ride = useRef<OrbKeyboardRide | null>(null)
  ride.current ??= new OrbKeyboardRide(currentSoftKeyboardHeight())

  useEffect(() => {
    inset.value = bottomInset
  }, [bottomInset, inset])

  useEffect(() => {
    placed.value = top !== undefined
    const next = ride.current!.report(top, Date.now())
    if (next) {
      base.value = next
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only shared values are written
  }, [top])

  useEffect(() => {
    // The page's word once the keyboard is still: taken on the UI thread in one go, from where the orb is then.
    const settle = runOnUI((next: OrbBase) => {
      'worklet'
      const now = orbTop(base.value, next.keyboard, inset.value) + settling.value
      base.value = next
      const off = now - next.top
      settling.value = off
      if (Math.abs(off) > 1) {
        settling.value = withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.quad) })
      } else {
        settling.value = 0
      }
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    const moves = (height: number, ms: number) => {
      ride.current!.keyboardMoves(height, ms, Date.now())
      if (ms <= 0) {
        return
      }
      clearTimeout(timer)
      timer = setTimeout(() => {
        const next = ride.current!.settle(Date.now())
        if (next) {
          settle(next)
        }
      }, ms + RIDE_SLACK_MS)
    }
    const unsubscribe = subscribeSoftKeyboard(moves, (ms) => moves(0, ms))
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only shared values are written
  }, [])

  return useAnimatedStyle(() =>
    placed.value
      ? { top: orbTop(base.value, keyboard.height.value, inset.value) + settling.value }
      : {}
  )
}
