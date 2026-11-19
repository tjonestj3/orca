import { useMemo } from 'react'
import { useMobileDarkTheme, useSessionMonospace } from '../../theme/mobile-appearance'
import { ORCA_DARK_TO_MOCHA } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { PAGE_MODAL_WATCH } from '../../jarvis/page-modal'

const MOCHA_PAIRS = Object.entries(ORCA_DARK_TO_MOCHA)

/** The script the shell runs in Orca's session page: the app's theme and font over Orca's, and the watch that tells
 * Xeno's orb when the page has a sheet open (see jarvis/page-modal). */
export function usePageRepaint(): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const mocha = scheme === 'dark' && theme === 'mocha'
  return useMemo(
    () =>
      [pageRepaintScript(mocha ? MOCHA_PAIRS : [], monospace), PAGE_MODAL_WATCH]
        .filter(Boolean)
        .join('\n'),
    [mocha, monospace]
  )
}
