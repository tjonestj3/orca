import { useMemo } from 'react'
import { useMobileDarkTheme, useSessionMonospace } from '../../theme/mobile-appearance'
import { DARK_THEMES } from '../../theme/dark-themes'
import { ORCA_DARK_ROLES, ORCA_RAISED, themePairs } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useSideColumn } from '../../layout/side-rail'
import { PAGE_MODAL_WATCH } from '../../jarvis/page-modal'
import { HEADER_ORB, HEADER_ORB_GAP, pageHeaderScript } from '../../jarvis/page-header'
import { PAGE_SCROLL_PIN } from './page-scroll-pin'

const RAISED_ROLE = ORCA_DARK_ROLES[ORCA_RAISED]

/**
 * The script the shell runs in Orca's pages: the app's theme, font and inline code colour over Orca's, the watch
 * that tells Xeno's orb when the page has a sheet open (jarvis/page-modal), the keyboard scroll pin, and, on a page
 * that isn't a session (`headerClear`), its header kept clear of the folded Duo's camera with room for the orb
 * (jarvis/page-header).
 */
export function usePageRepaint(options: { headerClear: boolean }): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const t = useMobileTranslation()
  const column = useSideColumn()
  const themed = scheme === 'dark' && theme !== 'orca' ? DARK_THEMES[theme].colours : null
  const label = options.headerClear
    ? t('hostScreen.hostScreenHeader.moreActions', 'More actions')
    : null
  const pad = label && column?.extended ? column.width + HEADER_ORB + HEADER_ORB_GAP * 2 : 0
  return useMemo(() => {
    const code = themed && RAISED_ROLE ? { raised: themed[RAISED_ROLE], text: themed.yellow } : null
    const repaint = pageRepaintScript(themed ? themePairs(themed) : [], monospace, code)
    return [repaint, PAGE_MODAL_WATCH, PAGE_SCROLL_PIN, pageHeaderScript(label, pad)].join('\n')
  }, [themed, monospace, label, pad])
}
