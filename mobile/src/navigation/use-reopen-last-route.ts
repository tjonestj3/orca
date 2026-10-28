import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { lastRouteHref, loadLastRoute, saveLastRoute } from './last-route'

type Router = { navigate: (href: string) => void }

function launchedFromNotification(): boolean {
  try {
    return Notifications.getLastNotificationResponse() !== null
  } catch {
    return false
  }
}

/**
 * iOS closes a backgrounded app to reclaim memory, and the relaunch would start over on Home or
 * whatever the launch link names, dropping the workspace, the Floating Workspace and the tab on
 * show. Remember the screen on show and reopen it once at launch, unless a notification tap or the
 * user has already moved somewhere.
 */
export function useReopenLastRoute(
  router: Router,
  pathname: string,
  params: Readonly<Record<string, string | string[] | undefined>>
): void {
  const reopenSettledRef = useRef(false)
  const launchPathnameRef = useRef(pathname)
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const href = lastRouteHref(pathname, params)
  const hrefRef = useRef(href)
  hrefRef.current = href

  const reopenStartedRef = useRef(false)
  useEffect(() => {
    // Once per launch: the reopen must not chase later navigation.
    if (reopenStartedRef.current) {
      return
    }
    reopenStartedRef.current = true
    const fromNotification = launchedFromNotification()
    void loadLastRoute().then((href) => {
      reopenSettledRef.current = true
      if (
        href !== null &&
        !fromNotification &&
        pathnameRef.current === launchPathnameRef.current &&
        href.split('?')[0] !== pathnameRef.current
      ) {
        router.navigate(href)
        return
      }
      // Moved before the read settled: remember where to now.
      void saveLastRoute(hrefRef.current)
    })
  }, [router])

  useEffect(() => {
    // Saving before the reopen reads would overwrite the screen being reopened with Home.
    if (reopenSettledRef.current) {
      void saveLastRoute(href)
    }
  }, [href])
}
