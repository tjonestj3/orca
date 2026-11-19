// The Jarvis screen's orb: small enough on a phone that the worktree list and conversation get the room.
const ORB_MAX = 160

export function stageOrbSize(width: number, height: number): number {
  return Math.round(Math.min(width * 0.36, height * 0.15, ORB_MAX))
}

// The Xeno chat's bottom padding: on the keyboard while it's up (its height counts from the screen's bottom
// edge), otherwise just above the home indicator.
export function keyboardPadding(keyboardHeight: number, bottomInset: number): number {
  'worklet'
  return Math.max(keyboardHeight, bottomInset)
}
