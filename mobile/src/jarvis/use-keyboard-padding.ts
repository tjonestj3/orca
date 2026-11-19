import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import {
  currentSoftKeyboardHeight,
  subscribeSoftKeyboard
} from '../platform/keyboard/keyboard-occlusion'
import { keyboardPadding } from './jarvis-screen-layout'

// iOS's keyboard moves on roughly this curve; matching it keeps the composer glued to the keyboard's top edge.
const KEYBOARD_EASING = Easing.bezier(0.17, 0.59, 0.4, 0.77)

// The Xeno chat's bottom padding as an animated style: it rides up and down with the keyboard, over the
// keyboard's own duration, and rests just above the home indicator when the keyboard is down.
export function useKeyboardPadding(bottomInset: number) {
  const keyboard = useSharedValue(currentSoftKeyboardHeight())
  const inset = useSharedValue(bottomInset)
  const duration = useSharedValue(0)

  useEffect(() => {
    inset.value = bottomInset
  }, [bottomInset, inset])

  useEffect(
    () =>
      subscribeSoftKeyboard(
        (height, ms) => {
          duration.value = ms
          keyboard.value = height
        },
        (ms) => {
          duration.value = ms
          keyboard.value = 0
        }
      ),
    [duration, keyboard]
  )

  return useAnimatedStyle(() => ({
    paddingBottom: withTiming(keyboardPadding(keyboard.value, inset.value), {
      duration: duration.value,
      easing: KEYBOARD_EASING
    })
  }))
}
