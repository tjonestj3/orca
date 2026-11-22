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

// What the phone's widgets show: what needs you, the agents, the last reply (fetched by the widgets themselves).
export function jarvisGlanceUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/glance`
}

export function jarvisHistoryUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/history`
}

// The typed chat: send a message, stop the reply being written, start a new conversation.
export function jarvisChatUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/chat`
}

// An image typed with a message, by the id the server keeps it under.
export function jarvisImageUrl(endpoint: string, id: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && /^[0-9a-f]{32}$/.test(id) ? `${base}/api/jarvis/images/${id}` : null
}

export function jarvisChatStopUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/chat/stop`
}

export function jarvisChatNewUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/chat/new`
}

// The cheap "is Jarvis there?" check: answered without asking Orca anything.
export function jarvisPingUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/ping`
}

// The phone's key, handed out only over Tailscale (see jarvis-key).
export function jarvisPairUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/pair`
}

// The voices Xeno can speak in, for the voice menu.
export function jarvisVoicesUrl(endpoint: string): string | null {
  const base = jarvisBaseUrl(endpoint)
  return base && `${base}/api/jarvis/voices`
}
