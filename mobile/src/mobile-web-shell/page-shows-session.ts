import { sessionOfPageLocation } from '../notifications/notification-viewing-policy'

/**
 * Whether a page is showing a session: its own session screen, or the host list's page once it has
 * opened one inside itself (a tapped worktree, Jump back in, a notification) and said so.
 */
export function pageShowsSession(routePathname: string, pageHref: string | null): boolean {
  return (
    routePathname.includes('/session/') ||
    (pageHref !== null && sessionOfPageLocation(pageHref) !== null)
  )
}
