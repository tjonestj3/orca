import type { JarvisPhase } from './jarvis-call-state'

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

// A live call stays on its desktop (until you go into another and it follows: callMoveTarget); otherwise the desktop you're inside, else the last one you were in, else the
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

/** How long you stay inside another desktop before a live call follows you there: a glance doesn't move it. */
export const CALL_FOLLOWS_AFTER_MS = 2000

/**
 * The desktop a live call should move to: the one you've gone into, when its Xeno answers and this call's Xeno is
 * only listening, so nothing it's saying or hearing is cut off (otherwise it waits until it is). Each desktop runs
 * its own Xeno, and one can't pass what you say to another, so talking to Xeno while working in a desktop needs
 * the call to be there. Null to stay where it is.
 */
export function callMoveTarget(s: {
  readonly live: boolean
  readonly phase: JarvisPhase
  readonly callHostId: string | null
  readonly routeHostId: string | null
  readonly reachable: ReadonlySet<string>
}): string | null {
  if (!s.live || s.phase !== 'listening' || !s.routeHostId || !s.callHostId) {
    return null
  }
  if (s.routeHostId === s.callHostId || !s.reachable.has(s.routeHostId)) {
    return null
  }
  return s.routeHostId
}
