import { Linking } from 'react-native'
import { claudeArtifactUrl } from './jarvis-artifacts'

// Opens a Claude artifact in the Claude app (Safari without it). Anything but a claude.ai artifact link is ignored.
export function openInClaude(url: string): void {
  const safe = claudeArtifactUrl(url)
  if (safe) {
    void Linking.openURL(safe).catch(() => undefined)
  }
}
