import { readJarvisMessage, type JarvisMessage } from './jarvis-history'

// Typing to Xeno: requests to the Jarvis server's chat endpoints. The answer itself arrives through the history
// poll, as it's written.

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export type JarvisChatSend =
  | { readonly ok: true; readonly message: JarvisMessage }
  | { readonly ok: false; readonly error: 'unreachable' | 'refused' }

const TIMEOUT_MS = 6000

async function post(fetcher: Fetcher, url: string, body?: object): Promise<Response> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    return await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: abort.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function sendJarvisChat(
  url: string,
  text: string,
  viewing: string | null,
  fetcher: Fetcher = fetch
): Promise<JarvisChatSend> {
  let response: Response
  try {
    response = await post(fetcher, url, { text, viewing })
  } catch {
    return { ok: false, error: 'unreachable' }
  }
  if (!response.ok) {
    return { ok: false, error: 'refused' }
  }
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null
  const message = readJarvisMessage(body?.message)
  return message ? { ok: true, message } : { ok: false, error: 'refused' }
}

export async function stopJarvisChat(url: string, fetcher: Fetcher = fetch): Promise<boolean> {
  try {
    const response = await post(fetcher, url)
    const body = (await response.json().catch(() => null)) as { stopped?: unknown } | null
    return response.ok && body?.stopped === true
  } catch {
    return false
  }
}

export async function newJarvisConversation(
  url: string,
  fetcher: Fetcher = fetch
): Promise<boolean> {
  try {
    return (await post(fetcher, url)).ok
  } catch {
    return false
  }
}
