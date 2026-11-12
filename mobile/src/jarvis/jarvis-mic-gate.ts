// Whether the call's microphone track sends audio: never before the call connects, then hands-free, with
// "Hey Xeno" (which listens for its name), or while held.
export function micShouldBeOpen(gate: {
  handsFree: boolean
  wake: boolean
  holding: boolean
  connected: boolean
}): boolean {
  return gate.connected && (gate.handsFree || gate.wake || gate.holding)
}

// What Xeno hears once the data channel opens: the worktree on screen, a talk button held since before, and
// whether to wait for its name.
export function openingClientMessages(s: {
  viewing: string | null
  holding: boolean
  wake: boolean
}): [string, Record<string, unknown>][] {
  const messages: [string, Record<string, unknown>][] = []
  if (s.viewing) {
    messages.push(['jarvis-context', { worktreeId: s.viewing }])
  }
  if (s.holding) {
    messages.push(['jarvis-ptt', { state: 'down' }])
  }
  if (s.wake) {
    messages.push(['jarvis-wake', { on: true }])
  }
  return messages
}
