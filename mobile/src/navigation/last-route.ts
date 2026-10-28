import AsyncStorage from '@react-native-async-storage/async-storage'

const LAST_ROUTE_KEY = 'orca:lastRoute'
/** Past this, a relaunch starts fresh rather than dropping the user into a day-old workspace. */
const LAST_ROUTE_MAX_AGE_MS = 24 * 60 * 60 * 1000

type StoredRoute = { href: string; at: number }

/**
 * The href for the screen on show: its path plus the query params that are not path segments,
 * such as a session's seeded `name`. Null for anything outside a host's screens.
 */
export function lastRouteHref(
  pathname: string,
  params: Readonly<Record<string, string | string[] | undefined>>
): string | null {
  if (!pathname.startsWith('/h/')) {
    return null
  }
  const segments = new Set(pathname.split('/').map((segment) => decodeURIComponent(segment)))
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (typeof value === 'string' && !segments.has(value)) {
      query.append(name, value)
    }
  }
  const search = query.toString()
  return search ? `${pathname}?${search}` : pathname
}

/** Remembers the screen on show; null (Home, Settings, pairing) means nothing to reopen. */
export async function saveLastRoute(href: string | null, now = Date.now()): Promise<void> {
  try {
    if (href === null) {
      await AsyncStorage.removeItem(LAST_ROUTE_KEY)
      return
    }
    await AsyncStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ href, at: now }))
  } catch {
    // Unwritable storage only costs the reopen.
  }
}

/** The host screen to reopen after iOS closed the app in the background, if recent. */
export async function loadLastRoute(now = Date.now()): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_ROUTE_KEY)
    if (!raw) {
      return null
    }
    const stored = JSON.parse(raw) as Partial<StoredRoute>
    if (
      typeof stored.href !== 'string' ||
      !stored.href.startsWith('/h/') ||
      typeof stored.at !== 'number' ||
      now - stored.at > LAST_ROUTE_MAX_AGE_MS
    ) {
      return null
    }
    return stored.href
  } catch {
    return null
  }
}
