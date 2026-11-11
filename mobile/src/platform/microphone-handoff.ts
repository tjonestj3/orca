// Orca's dictation and a Jarvis call share the iOS audio session; dictation announces itself so the call can end first.
// A listener returns true when it ended a call: WebRTC lets go of the session just after, so dictation waits a moment.
export const MICROPHONE_HANDOFF_SETTLE_MS = 250

const listeners = new Set<() => boolean>()

export async function announceDictationStarting(): Promise<void> {
  let ended = false
  listeners.forEach((listener) => {
    ended = listener() || ended
  })
  if (ended) {
    await new Promise((resolve) => setTimeout(resolve, MICROPHONE_HANDOFF_SETTLE_MS))
  }
}

export function onDictationStarting(listener: () => boolean): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
