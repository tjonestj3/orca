import { useIsFocused } from 'expo-router'
import { useScreenLeaving } from '../navigation/use-screen-leaving'
import { useShowsSession, type SessionView } from '../session/showing-session'
import { PageOrb } from './JarvisBubble'

/**
 * For a desktop page's screen: holds which session view it shows (showing-session), and the orb it draws over its
 * page (PageOrb), shown while the screen is in front or still sliding away, so it goes with the screen.
 */
export function usePageOrb(page: string | null, session: boolean, terminal: boolean) {
  const view: SessionView | null = session ? (terminal ? 'terminal' : 'chat') : null
  useShowsSession(view)
  const focused = useIsFocused()
  const leaving = useScreenLeaving()
  return <PageOrb page={page} view={view} visible={focused || leaving} />
}
