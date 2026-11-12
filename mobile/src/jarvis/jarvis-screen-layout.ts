// The Jarvis screen's orb: small enough on a phone that the worktree list and conversation get the room.
const ORB_MAX = 160

export function stageOrbSize(width: number, height: number): number {
  return Math.round(Math.min(width * 0.36, height * 0.15, ORB_MAX))
}
