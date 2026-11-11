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
