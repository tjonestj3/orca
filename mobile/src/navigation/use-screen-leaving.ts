import { useEffect, useState } from 'react'
import { useNavigation } from 'expo-router'

type TransitionEvent = { data?: { closing?: boolean } }
// The native stack's own events, which these screens are in; the router's navigation type names only the common ones.
type StackEvents = {
  addListener(
    name: 'transitionStart' | 'transitionEnd' | 'gestureCancel' | 'focus',
    listener: (event: TransitionEvent) => void
  ): () => void
}

/**
 * Whether this screen is on its way out: from the moment it starts to go (a back swipe begins, or Back is tapped),
 * not once it has gone, which is when it loses focus. Back again if a swipe is called off. What the screen draws
 * over the whole window (Xeno's orb, the column toggle) goes as it starts to leave, rather than hang over the
 * screen sliding in under it.
 */
export function useScreenLeaving(): boolean {
  const navigation = useNavigation<StackEvents>()
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const on = navigation.addListener.bind(navigation)
    const offStart = on('transitionStart', (event) => setLeaving(event.data?.closing === true))
    const offCancel = on('gestureCancel', () => setLeaving(false))
    const offFocus = on('focus', () => setLeaving(false))
    return () => {
      offStart()
      offCancel()
      offFocus()
    }
  }, [navigation])
  return leaving
}

// Longest a screen counts as still sliding in, should its transition never say it's done.
const ARRIVING_MAX_MS = 1000

/**
 * Whether this screen is still sliding in: from the moment it starts to appear (going back to it, or opening it)
 * until it's fully there. It takes focus as the slide starts, so what follows focus (Xeno's orb, placed by this
 * page's buttons) would show at its place on this screen while the screen leaving still covers it: going back to
 * the host list, the orb slid across the chat after the + hidden under it (Nov 20).
 */
export function useScreenArriving(): boolean {
  const navigation = useNavigation<StackEvents>()
  const [arriving, setArriving] = useState(false)
  useEffect(() => {
    const on = navigation.addListener.bind(navigation)
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = (): void => {
      clearTimeout(timer)
      setArriving(false)
    }
    const offStart = on('transitionStart', (event) => {
      if (event.data?.closing === true) {
        return
      }
      setArriving(true)
      clearTimeout(timer)
      timer = setTimeout(done, ARRIVING_MAX_MS)
    })
    const offEnd = on('transitionEnd', done)
    const offCancel = on('gestureCancel', done)
    return () => {
      offStart()
      offEnd()
      offCancel()
      clearTimeout(timer)
    }
  }, [navigation])
  return arriving
}
