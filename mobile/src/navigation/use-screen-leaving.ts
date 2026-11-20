import { useEffect, useState } from 'react'
import { useNavigation } from 'expo-router'

type TransitionEvent = { data?: { closing?: boolean } }
// The native stack's own events, which these screens are in; the router's navigation type names only the common ones.
type StackEvents = {
  addListener(
    name: 'transitionStart' | 'gestureCancel' | 'focus',
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
