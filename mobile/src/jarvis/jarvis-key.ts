// Xeno lets in this computer, Tailscale devices, and anything else only with its key. The app picks the key up
// the first time it reaches Xeno over Tailscale (the only way Xeno hands it out), keeps it in the keychain, and
// sends it with every request, so home Wi-Fi works too.

// SecureStore keys must match [A-Za-z0-9._-].
const STORE_KEY = 'orca.xeno-keys'
const MAX_KEYS = 5 // one per desktop running Xeno, newest first

type KeyStore = { read: () => Promise<string | null>; write: (value: string) => Promise<void> }

// The keychain, loaded when first used, so modules that only build requests don't pull in native storage.
const keychain: KeyStore = {
  read: async () => {
    const { Platform } = await import('react-native')
    if (Platform.OS === 'web') {
      return (await import('@react-native-async-storage/async-storage')).default.getItem(STORE_KEY)
    }
    return (await import('../host-credentials/pairing-keychain')).readPairingKeychainItem(STORE_KEY)
  },
  write: async (value) => {
    const { Platform } = await import('react-native')
    if (Platform.OS === 'web') {
      await (
        await import('@react-native-async-storage/async-storage')
      ).default.setItem(STORE_KEY, value)
      return
    }
    await (
      await import('../host-credentials/pairing-keychain')
    ).writePairingKeychainItem(STORE_KEY, value)
  }
}

export class XenoKeys {
  private keys: string[] = []
  private loading: Promise<void> | null = null

  constructor(private readonly store: KeyStore) {}

  // Reads the saved keys once; later calls wait on the same read.
  load(): Promise<void> {
    this.loading ??= this.store
      .read()
      .then((saved) => {
        const parsed: unknown = saved ? JSON.parse(saved) : []
        if (Array.isArray(parsed)) {
          this.keys = parsed.filter((k): k is string => typeof k === 'string' && k.length > 0)
        }
      })
      .catch(() => {})
    return this.loading
  }

  headers(): Record<string, string> {
    return this.keys.length ? { 'X-Xeno-Key': this.keys.join(',') } : {}
  }

  async remember(key: string): Promise<void> {
    this.keys = [key, ...this.keys.filter((k) => k !== key)].slice(0, MAX_KEYS)
    await this.store.write(JSON.stringify(this.keys)).catch(() => {})
  }
}

export const xenoKeys = new XenoKeys(keychain)

export function withXenoKey(
  init: RequestInit | undefined,
  headers: Record<string, string>
): RequestInit {
  return {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...headers }
  }
}

// fetch, with the key: every request the app makes to Xeno goes through this.
export async function xenoFetch(url: string, init?: RequestInit): Promise<Response> {
  await xenoKeys.load()
  return fetch(url, withXenoKey(init, xenoKeys.headers()))
}

// After a ping: when Xeno let this request in without the key (so over Tailscale), fetch the key and keep it.
export async function pairIfNeeded(
  ping: unknown,
  pairUrl: string | null,
  keys: XenoKeys = xenoKeys,
  fetcher: (url: string) => Promise<Response> = (url) => xenoFetch(url)
): Promise<void> {
  if (
    !pairUrl ||
    typeof ping !== 'object' ||
    ping === null ||
    (ping as { key?: unknown }).key !== false
  ) {
    return
  }
  try {
    const response = await fetcher(pairUrl)
    const body: unknown = response.ok ? await response.json() : null
    const key = (body as { key?: unknown } | null)?.key
    if (typeof key === 'string' && key) {
      await keys.remember(key)
    }
  } catch {
    // Not paired this time; the next ping over Tailscale tries again.
  }
}
