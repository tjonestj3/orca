// Claude artifacts an agent linked (pages it published on claude.ai), which the app opens in the Claude app: iOS
// hands claude.ai's /artifact, /artifacts, /public/artifacts and /code links to it as universal links.
export type JarvisArtifact = { readonly url: string; readonly title: string | null }

const MAX_ARTIFACTS = 3
const CLAUDE_ARTIFACT =
  /^https:\/\/claude\.ai\/(?:code\/artifact|public\/artifacts|artifacts?)\/[A-Za-z0-9_-]+$/

// The link, if it's a Claude artifact; the app never opens anything else an agent wrote.
export function claudeArtifactUrl(raw: unknown): string | null {
  return typeof raw === 'string' && CLAUDE_ARTIFACT.test(raw) && !raw.includes('/artifacts/invite')
    ? raw
    : null
}

export function readArtifact(raw: unknown): JarvisArtifact | null {
  if (typeof raw !== 'object' || raw === null || !('url' in raw)) {
    return null
  }
  const url = claudeArtifactUrl(raw.url)
  if (!url) {
    return null
  }
  const title = 'title' in raw ? raw.title : null
  return { url, title: typeof title === 'string' && title ? title : null }
}

export function readArtifacts(raw: unknown): JarvisArtifact[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map(readArtifact)
    .filter((a): a is JarvisArtifact => a !== null)
    .slice(0, MAX_ARTIFACTS)
}
