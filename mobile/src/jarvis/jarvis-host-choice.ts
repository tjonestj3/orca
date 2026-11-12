// Which desktop's Xeno the app talks to. Each paired desktop runs its own Xeno beside its own Orca.
const HOST_ROUTE = /^\/h\/([^/]+)/

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

/** The desktop a route is inside (`/h/<hostId>/…`), or null on the app's own screens. */
export function hostIdFromPath(pathname: string): string | null {
  const match = HOST_ROUTE.exec(pathname)
  return match ? decode(match[1]) : null
}

// A live call stays on its desktop; otherwise the desktop you're inside, else the last one you were in, else the
// only desktop running Xeno. With several running and none picked yet, the person is asked once.
export function chooseXenoHost(s: {
  readonly routeHostId: string | null
  readonly lastHostId: string | null
  readonly callHostId: string | null
  readonly reachable: ReadonlySet<string>
}): { hostId: string | null; needsPick: boolean } {
  const hostId = s.callHostId ?? s.routeHostId ?? s.lastHostId
  if (hostId) {
    return { hostId, needsPick: false }
  }
  if (s.reachable.size === 1) {
    return { hostId: [...s.reachable][0], needsPick: false }
  }
  return { hostId: null, needsPick: s.reachable.size > 1 }
}
