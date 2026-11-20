import { useCallback } from 'react'
import { foldedFullScreen } from '../../layout/folded-full-screen'
import { triggerMediumImpact } from '../../platform/haptics/haptics'
import { isColumnToggleMessage } from './page-column-toggle'
import { isHoldHapticMessage } from './page-pill-tap'

/**
 * The page's messages, with the session bar's own taken out and acted on here: its full-screen toggle tapped
 * (page-column-toggle), and a hold on its agent's tab that opened the tab's menu (page-pill-tap), felt at once.
 */
export function useShellPageMessages<E extends { nativeEvent: { json: string } }>(
  onPageMessage: (event: E) => void
): (event: E) => void {
  return useCallback(
    (event: E) => {
      const json = event.nativeEvent.json
      if (isColumnToggleMessage(json)) {
        foldedFullScreen.toggle()
        return
      }
      if (isHoldHapticMessage(json)) {
        triggerMediumImpact()
        return
      }
      onPageMessage(event)
    },
    [onPageMessage]
  )
}
