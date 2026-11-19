import { useMemo } from 'react'
import { useMobileDarkTheme, useSessionMonospace } from '../../theme/mobile-appearance'
import { ORCA_DARK_TO_MOCHA } from '../../theme/mocha-theme'
import { pageRepaintScript } from '../../theme/page-repaint'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

const MOCHA_PAIRS = Object.entries(ORCA_DARK_TO_MOCHA)

/** The script that paints Orca's session page in the app's theme and font; empty when it's Orca's own. */
export function usePageRepaint(): string {
  const scheme = useMobileColorScheme()
  const theme = useMobileDarkTheme()
  const monospace = useSessionMonospace()
  const mocha = scheme === 'dark' && theme === 'mocha'
  return useMemo(() => pageRepaintScript(mocha ? MOCHA_PAIRS : [], monospace), [mocha, monospace])
}
