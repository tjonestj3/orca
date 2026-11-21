import { useCallback } from 'react'
import { foldedFullScreen } from '../../layout/folded-full-screen'
import { triggerMediumImpact } from '../../platform/haptics/haptics'
import { isColumnToggleMessage } from './page-column-toggle'
import { isHoldHapticMessage } from './page-pill-tap'
import { usePageModalWatch } from '../../jarvis/use-page-modal-watch'

/**
 * The page's messages, with the session bar's own taken out and acted on here: its full-screen toggle tapped
 * (page-column-toggle), and a hold on its agent's tab that opened the tab's menu (page-pill-tap), felt at once.
 */
export function useShellPageMessages(
  page: string | null,
  bridge: { readonly onBridgeMessage: Parameters<typeof usePageModalWatch>[1] },
  pageTop: number
): ReturnType<typeof usePageModalWatch> {
  // Then the orb's: the page's sheets (page-modal) and where its controls are (page-anchors).
  const onPageMessage = usePageModalWatch(page, bridge.onBridgeMessage, pageTop)
  return useCallback(
    (event) => {
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
