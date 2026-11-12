// The rail orb fills the side strip on its own; among a worktree's shortcut keys it is key-sized.
const RAIL_KEY_SIZE = 40
const RAIL_ORB_INSET = 12

export function railOrbSize(stripWidth: number, besideKeys: boolean): number {
  return besideKeys ? RAIL_KEY_SIZE : stripWidth - RAIL_ORB_INSET * 2
}

// A press shorter than this opens the Jarvis screen instead of talking.
export const TAP_MAX_MS = 250

export function classifyBubbleRelease(heldMs: number): 'tap' | 'talk' {
  return heldMs < TAP_MAX_MS ? 'tap' : 'talk'
}

// The floating bubble: never over the Jarvis screen or when the folded Duo's rail holds Jarvis; otherwise
// always during a call, and before one once the computer's Jarvis has answered.
export function bubbleVisible(s: {
  live: boolean
  reachable: boolean | null
  onJarvisScreen: boolean
  railAvailable: boolean
}): boolean {
  if (s.onJarvisScreen || s.railAvailable) {
    return false
  }
  return s.live || s.reachable === true
}

// A press on the bubble or rail orb. In a live call the mic opens at once; with no call, the call starts only
// once the press has outlasted a tap, so a tap just opens the Jarvis screen.
export function bubblePress(actions: {
  live: () => boolean
  pressTalk: () => void
  releaseTalk: () => void
  cancelTalk: () => void
  openScreen: () => void
}): { pressIn: () => void; pressOut: () => void; unmount: () => void } {
  let pressedAt = 0
  let talking = false
  let pending: ReturnType<typeof setTimeout> | null = null
  const talk = (): void => {
    talking = true
    actions.pressTalk()
  }
  const clearPending = (): boolean => {
    if (!pending) {
      return false
    }
    clearTimeout(pending)
    pending = null
    return true
  }
  return {
    pressIn: () => {
      pressedAt = Date.now()
      if (actions.live()) {
        talk()
      } else {
        pending = setTimeout(() => {
          pending = null
          talk()
        }, TAP_MAX_MS)
      }
    },
    pressOut: () => {
      if (clearPending()) {
        actions.openScreen()
        return
      }
      talking = false
      if (classifyBubbleRelease(Date.now() - pressedAt) === 'talk') {
        actions.releaseTalk()
      } else {
        actions.cancelTalk()
        actions.openScreen()
      }
    },
    // Folding or unfolding the Duo moves Jarvis between bubble and rail mid-hold: that counts as letting go.
    unmount: () => {
      clearPending()
      if (talking) {
        talking = false
        actions.releaseTalk()
      }
    }
  }
}

// The folded Duo's rail orb: for a known computer, on every screen but the Jarvis screen, which has its own.
export function railOrbVisible(s: {
  hasStrip: boolean
  hasHost: boolean
  onJarvisScreen: boolean
}): boolean {
  return s.hasStrip && s.hasHost && !s.onJarvisScreen
}
