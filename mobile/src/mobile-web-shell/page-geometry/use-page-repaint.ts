import { useMemo } from 'react'
import { useMobileDarkTheme, useSessionMonospace } from '../../theme/mobile-appearance'
import { DARK_THEMES } from '../../theme/dark-themes'
import { ORCA_DARK_ROLES, ORCA_RAISED, themePairs } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useSideColumn } from '../../layout/side-rail'
import { PAGE_MODAL_WATCH } from '../../jarvis/page-modal'
import { HEADER_ORB, HEADER_ORB_GAP, pageAnchorsScript } from '../../jarvis/page-anchors'
import { PAGE_SCROLL_PIN } from './page-scroll-pin'
import { PAGE_QUESTION_ROOM } from './page-question-room'

const RAISED_ROLE = ORCA_DARK_ROLES[ORCA_RAISED]

/**
 * The script the shell runs in Orca's pages: the app's theme, font and inline code colour over Orca's, the watch
 * that tells Xeno's orb when the page has a sheet open (jarvis/page-modal), the keyboard scroll pin, and the
 * buttons the orb goes beside (jarvis/page-anchors): a session's mic, or on another page (`headerClear`) its
 * header's menu, the header kept clear of the folded Duo's camera with room for the orb; and in a session, more
 * room for an agent's question (page-question-room).
 */
export function usePageRepaint(options: { headerClear: boolean }): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const t = useMobileTranslation()
  const column = useSideColumn()
  const themed = scheme === 'dark' && theme !== 'orca' ? DARK_THEMES[theme].colours : null
  const header = t('hostScreen.hostScreenHeader.moreActions', 'More actions')
  const mic = [
    t('dictation.controls.start', 'Dictate'),
    t('dictation.controls.starting', 'Starting dictation'),
    t('dictation.controls.stop', 'Stop and insert'),
    t('dictation.controls.finishing', 'Finishing dictation'),
    t('dictation.controls.retry', 'Retry dictation')
  ].join('\n')
  const pad =
    options.headerClear && column?.extended ? column.width + HEADER_ORB + HEADER_ORB_GAP * 2 : 0
  return useMemo(() => {
    const code = themed && RAISED_ROLE ? { raised: themed[RAISED_ROLE], text: themed.yellow } : null
    const repaint = pageRepaintScript(themed ? themePairs(themed) : [], monospace, code)
    const anchors = pageAnchorsScript(
      options.headerClear
        ? [{ name: 'header', labels: [header], near: 'top', pad }]
        : [
            { name: 'mic', labels: mic.split('\n'), near: 'bottom', pad: 0 },
            {
              name: 'question',
              labels: [],
              selector: '[role="radio"],[role="checkbox"]',
              near: 'bottom',
              pad: 0
            }
          ]
    )
    const sessionOnly = options.headerClear ? [] : [PAGE_QUESTION_ROOM]
    return [repaint, PAGE_MODAL_WATCH, PAGE_SCROLL_PIN, anchors, ...sessionOnly].join('\n')
  }, [themed, monospace, options.headerClear, header, mic, pad])
}
