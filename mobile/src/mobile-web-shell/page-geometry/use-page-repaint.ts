import { useMemo } from 'react'
import { useMobileDarkTheme, useSessionMonospace } from '../../theme/mobile-appearance'
import { DARK_THEMES } from '../../theme/dark-themes'
import { ORCA_DARK_ROLES, ORCA_RAISED, themePairs } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { PAGE_MODAL_WATCH } from '../../jarvis/page-modal'
import { PAGE_SCROLL_PIN } from './page-scroll-pin'

const RAISED_ROLE = ORCA_DARK_ROLES[ORCA_RAISED]

/**
 * The script the shell runs in Orca's session page: the app's theme, font and inline code colour over Orca's, the
 * watch that tells Xeno's orb when the page has a sheet open (jarvis/page-modal), and the keyboard scroll pin.
 */
export function usePageRepaint(): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const themed = scheme === 'dark' && theme !== 'orca' ? DARK_THEMES[theme].colours : null
  return useMemo(() => {
    const code = themed && RAISED_ROLE ? { raised: themed[RAISED_ROLE], text: themed.yellow } : null
    const repaint = pageRepaintScript(themed ? themePairs(themed) : [], monospace, code)
    return [repaint, PAGE_MODAL_WATCH, PAGE_SCROLL_PIN].join('\n')
  }, [themed, monospace])
}
