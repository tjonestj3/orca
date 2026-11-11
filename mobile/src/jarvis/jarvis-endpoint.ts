// Jarvis's voice server runs beside Orca on the paired desktop; the phone reaches it on the host's own address.
export const JARVIS_PORT = 7860

export function jarvisOfferUrl(endpoint: string): string | null {
  try {
    const hostname = new URL(endpoint).hostname
    if (!hostname) {
      return null
    }
    // URL implementations differ on whether an IPv6 hostname keeps its brackets.
    const host = hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname
    return `http://${host}:${JARVIS_PORT}/api/offer`
  } catch {
    return null
  }
}
