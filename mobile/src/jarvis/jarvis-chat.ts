import { readJarvisMessage, type JarvisMessage } from './jarvis-history'
import { xenoFetch } from './jarvis-key'

// Typing to Xeno: requests to the Jarvis server's chat endpoints. The answer itself arrives through the history
// poll, as it's written.

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

// How a send ended, for the composer to say: refused means Xeno was reached but turned it down (an image it can't
// read, or an older Xeno that takes no images).
export type JarvisChatOutcome = 'sent' | 'unreachable' | 'refused'

export type JarvisChatSend =
  | { readonly ok: true; readonly message: JarvisMessage }
  | { readonly ok: false; readonly error: 'unreachable' | 'refused' }

// An image picked to send: its bytes as base64 (no data: prefix), and where it is on the phone, for its thumbnail.
export type JarvisChatImage = { readonly base64: string; readonly uri?: string }

const TIMEOUT_MS = 6000
// A phone photo is megabytes: over a slow connection it takes a while to reach the desktop.
const IMAGES_TIMEOUT_MS = 60_000

async function post(
  fetcher: Fetcher,
  url: string,
  body?: object,
  timeoutMs = TIMEOUT_MS
): Promise<Response> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), timeoutMs)
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
  fetcher: Fetcher = xenoFetch,
  images: readonly JarvisChatImage[] = []
): Promise<JarvisChatSend> {
  let response: Response
  try {
    response =
      images.length > 0
        ? await post(
            fetcher,
            url,
            { text, viewing, images: images.map((image) => ({ data: image.base64 })) },
            IMAGES_TIMEOUT_MS
          )
        : await post(fetcher, url, { text, viewing })
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

export async function stopJarvisChat(url: string, fetcher: Fetcher = xenoFetch): Promise<boolean> {
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
  fetcher: Fetcher = xenoFetch
): Promise<boolean> {
  try {
    return (await post(fetcher, url)).ok
  } catch {
    return false
  }
}
