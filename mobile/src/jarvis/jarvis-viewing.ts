// The worktree the app has open on the Jarvis computer, from the route: /h/<hostId>/session/<worktreeId>.
const SESSION_ROUTE = /^\/h\/([^/]+)\/session\/(.+)$/

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export function viewingTarget(pathname: string, jarvisHostId: string | null): string | null {
  const match = SESSION_ROUTE.exec(pathname)
  if (!match || !jarvisHostId || decode(match[1]) !== jarvisHostId) {
    return null
  }
  return decode(match[2]) || null
}
