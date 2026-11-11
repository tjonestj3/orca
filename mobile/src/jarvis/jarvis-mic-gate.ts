// Whether the call's microphone track sends audio: never before the call connects, then only hands-free or while held.
export function micShouldBeOpen(gate: {
  handsFree: boolean
  holding: boolean
  connected: boolean
}): boolean {
  return gate.connected && (gate.handsFree || gate.holding)
}
