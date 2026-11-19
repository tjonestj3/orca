import { useMemo } from 'react'
import {
  useMobileDarkTheme,
  useSessionMonospace,
  useSessionPill
} from '../../theme/mobile-appearance'
import { colors } from '../../theme/mobile-theme'
import { DARK_THEMES } from '../../theme/dark-themes'
import { ORCA_DARK_ROLES, ORCA_RAISED, themePairs } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useSideColumn } from '../../layout/side-rail'
import { PAGE_MODAL_WATCH } from '../../jarvis/page-modal'
import { PLUS_ORB_ROOM, TERMINAL_MIC_ROOM, pageAnchorsScript } from '../../jarvis/page-anchors'
import { PAGE_SCROLL_PIN } from './page-scroll-pin'
import { pagePillHeaderScript } from './page-pill-header'
import { PAGE_QUESTION_ROOM } from './page-question-room'

const RAISED_ROLE = ORCA_DARK_ROLES[ORCA_RAISED]

/**
 * The script the shell runs in Orca's pages: the app's theme, font and inline code colour over Orca's, the watch
 * that tells Xeno's orb when the page has a sheet open (jarvis/page-modal), the keyboard scroll pin, and the
 * buttons the orb goes beside (jarvis/page-anchors): a session's mic, or on another page (`headerClear`) its
 * + button, its header kept clear of the folded Duo's camera; and in a session, more
 * room for an agent's question (page-question-room).
 */
export function usePageRepaint(options: {
  headerClear: boolean
  terminal?: boolean
  hostHeaderLift?: number
  /** A chat session's pane: where its header floats as a pill (page-pill-header), or null for Orca's own. */
  pillAt?: { top: number; left: number; right: number } | null
}): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const t = useMobileTranslation()
  const column = useSideColumn()
  const themed = scheme === 'dark' && theme !== 'orca' ? DARK_THEMES[theme].colours : null
  const header = t('hostScreen.hostScreenHeader.moreActions', 'More actions')
  const plus = t('hostScreen.hostBottomBar.newWorkspace', 'New workspace')
  const copy = [
    t('session.markdownReader.copySource', 'Copy Markdown source'),
    t('session.markdownReader.copyLoadedSource', 'Copy loaded Markdown source')
  ].join('\n')
  const mic = [
    t('dictation.controls.start', 'Dictate'),
    t('dictation.controls.starting', 'Starting dictation'),
    t('dictation.controls.stop', 'Stop and insert'),
    t('dictation.controls.finishing', 'Finishing dictation'),
    t('dictation.controls.retry', 'Retry dictation')
  ].join('\n')
  const pad = options.headerClear && column?.extended ? column.width : 0
  // Room beside the + for Xeno's orb, wherever the orb floats rather than sitting in the folded Duo's rail.
  const plusRoom = options.headerClear && (!column || column.extended) ? PLUS_ORB_ROOM : 0
  // In a terminal the live input row makes room beside its mic, wherever the orb isn't in the folded Duo's rail.
  const micRoom = options.terminal && (!column || column.extended) ? TERMINAL_MIC_ROOM : 0
  const lift = Math.round(options.hostHeaderLift ?? 0)
  const pillOn = useSessionPill()
  const moreLabel = t('session.header.moreActions', 'More session actions')
  const newTabLabel = t('session.tabStrip.newTab', 'New tab')
  const pillBackground = colors.bgPanel
  const at = pillOn ? (options.pillAt ?? null) : null
  const pillTop = at?.top ?? 0
  const pillLeft = at?.left ?? 0
  const pillRight = at?.right ?? 0
  const pillShown = at !== null
  return useMemo(() => {
    const code = themed && RAISED_ROLE ? { raised: themed[RAISED_ROLE], text: themed.yellow } : null
    const repaint = pageRepaintScript(themed ? themePairs(themed) : [], monospace, code)
    const anchors = pageAnchorsScript(
      options.headerClear
        ? [
            { name: 'header', labels: [header], near: 'top', pad },
            { name: 'plus', labels: [plus], near: 'bottom', pad: plusRoom }
          ]
        : [
            { name: 'mic', labels: mic.split('\n'), near: 'bottom', pad: micRoom },
            { name: 'copy', labels: copy.split('\n'), near: 'bottom', pad: 0 },
            {
              name: 'approval',
              labels: [],
              selector: '[data-testid="native-chat-approval-actions"]',
              near: 'bottom',
              pad: 0
            },
            // The host list's header, when it shows beside the session (unfolded): up into the room it was given
            // for the camera, which is over the session's side.
            { name: 'header', labels: [header], near: 'top', pad: 0, lift: lift },
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
    const pill = pagePillHeaderScript(
      pillShown
        ? {
            moreLabel,
            newTabLabel,
            top: pillTop,
            left: pillLeft,
            right: pillRight,
            background: pillBackground
          }
        : null
    )
    return [repaint, PAGE_MODAL_WATCH, PAGE_SCROLL_PIN, anchors, pill, ...sessionOnly].join('\n')
  }, [
    themed,
    monospace,
    options.headerClear,
    header,
    plus,
    copy,
    mic,
    pad,
    plusRoom,
    micRoom,
    lift,
    pillShown,
    moreLabel,
    newTabLabel,
    pillTop,
    pillLeft,
    pillRight,
    pillBackground
  ])
}
