// Jarvis's voice server runs beside Orca on the paired desktop; the phone reaches it on the host's own address.
export const JARVIS_PORT = 7860

function jarvisBaseUrl(endpoint: string): string | null {
  try {
    const hostname = new URL(endpoint).hostname
    if (!hostname) {
      return null
    }
    // URL implementations differ on whether an IPv6 hostname keeps its brackets.
    const host = hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname
    return `http://${host}:${JARVIS_PORT}`
  } catch {
    return null
  }
}

export function jarvisOfferUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/offer`
}

export function jarvisWorktreesUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/worktrees`
}

export function jarvisHistoryUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/history`
}
