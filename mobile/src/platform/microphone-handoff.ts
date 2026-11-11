// Orca's dictation and a Jarvis call share the iOS audio session; dictation announces itself so the call can end first.
const listeners = new Set<() => void>()

export function announceDictationStarting(): void {
  listeners.forEach((listener) => listener())
}

export function onDictationStarting(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
