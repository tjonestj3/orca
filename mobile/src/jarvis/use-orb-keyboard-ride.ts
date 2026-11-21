import { useEffect, useRef } from 'react'
import {
  Easing,
  runOnUI,
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
 * The orb's top as an animated style. `top` is where it goes; `rides` says it's by a control on the page that
 * moves with the keyboard (the composer's mic), so it moves with that control as the keyboard comes and goes
 * (orb-keyboard-ride).
 * Every spot's top comes through here, riding or not: a top this style once set stays on the view until it sets
 * another, so a spot placed only by React (the host list's +) kept the session mic's height after a back swipe
 * (Nov 20).
 */
export function useOrbKeyboardRide(top: number, rides: boolean, bottomInset: number) {
  // The keyboard's height as the page is given it: its final height, the moment it starts to move (the shell
  // publishes that to the page, which moves its mic there at once). The orb takes the same number, so it moves
  // with the mic rather than with the keyboard's slide.
  const keyboard = useSharedValue(currentSoftKeyboardHeight())
  const base = useSharedValue<OrbBase>({ top, keyboard: currentSoftKeyboardHeight() })
  // Easing out a guess that was a few points off, once the keyboard is still (0 otherwise).
  const settling = useSharedValue(0)
  const still = useSharedValue(top) // a spot that doesn't ride: just here
  const riding = useSharedValue(rides)
  const inset = useSharedValue(bottomInset)
  const ride = useRef<OrbKeyboardRide | null>(null)
  ride.current ??= new OrbKeyboardRide(currentSoftKeyboardHeight())
  const rode = useRef(rides)

  useEffect(() => {
    inset.value = bottomInset
  }, [bottomInset, inset])

  useEffect(() => {
    const arriving = rides && !rode.current
    rode.current = rides
    if (!rides) {
      still.value = top
      riding.value = false
      return
    }
    const next = arriving ? ride.current!.arrive(top) : ride.current!.report(top, Date.now())
    if (next) {
      base.value = next
      if (arriving) {
        settling.value = 0
      }
    }
    riding.value = true
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only shared values are written
  }, [top, rides])

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
      keyboard.value = height
      ride.current!.keyboardMoves(height, ms, Date.now())
      if (ms <= 0) {
        return
      }
      clearTimeout(timer)
      timer = setTimeout(() => {
        const next = ride.current!.settle(Date.now())
        if (next && rode.current) {
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

  return useAnimatedStyle(() => ({
    top: riding.value
      ? orbTop(base.value, keyboard.value, inset.value) + settling.value
      : still.value
  }))
}
