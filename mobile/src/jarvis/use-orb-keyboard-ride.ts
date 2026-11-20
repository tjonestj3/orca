import { useEffect, useRef } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import {
  currentSoftKeyboardHeight,
  subscribeSoftKeyboard
} from '../platform/keyboard/keyboard-occlusion'
import { OrbKeyboardRide, RIDE_SLACK_MS, type OrbMove } from './orb-keyboard-ride'

// iOS's keyboard moves on roughly this curve (as use-keyboard-padding has it).
const KEYBOARD_EASING = Easing.bezier(0.17, 0.59, 0.4, 0.77)

/**
 * The orb's top as an animated style, riding with the keyboard (orb-keyboard-ride): `top` is where the page last
 * said it goes, or undefined for a spot placed some other way, which the style then leaves alone.
 */
export function useOrbKeyboardRide(top: number | undefined, bottomInset: number) {
  const shown = useSharedValue(top ?? 0)
  const placed = useSharedValue(top !== undefined)
  const ride = useRef<OrbKeyboardRide | null>(null)
  ride.current ??= new OrbKeyboardRide(currentSoftKeyboardHeight())
  const inset = useRef(bottomInset)
  inset.current = bottomInset

  const apply = (move: OrbMove | null) => {
    if (move) {
      shown.value =
        move.ms > 0 ? withTiming(move.to, { duration: move.ms, easing: KEYBOARD_EASING }) : move.to
    }
  }

  useEffect(() => {
    placed.value = top !== undefined
    apply(ride.current!.report(top, Date.now()))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply only writes shared values
  }, [top])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const moves = (height: number, ms: number) => {
      const glide = ride.current!.keyboardMoves(height, ms, inset.current, Date.now())
      if (!glide) {
        return
      }
      apply(glide)
      clearTimeout(timer)
      timer = setTimeout(() => apply(ride.current!.settle(Date.now())), ms + RIDE_SLACK_MS)
    }
    const unsubscribe = subscribeSoftKeyboard(moves, (ms) => moves(0, ms))
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply only writes shared values
  }, [])

  return useAnimatedStyle(() => (placed.value ? { top: shown.value } : {}))
}
