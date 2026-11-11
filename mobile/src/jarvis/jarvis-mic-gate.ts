// Whether the call's microphone track sends audio: never before the call connects, then only hands-free or while held.
export function micShouldBeOpen(gate: {
  handsFree: boolean
  holding: boolean
  connected: boolean
}): boolean {
  return gate.connected && (gate.handsFree || gate.holding)
}

// What Jarvis hears once the data channel opens: the worktree on screen, and a talk button held since before.
export function openingClientMessages(s: {
  viewing: string | null
  holding: boolean
}): [string, Record<string, unknown>][] {
  const messages: [string, Record<string, unknown>][] = []
  if (s.viewing) {
    messages.push(['jarvis-context', { worktreeId: s.viewing }])
  }
  if (s.holding) {
    messages.push(['jarvis-ptt', { state: 'down' }])
  }
  return messages
}
