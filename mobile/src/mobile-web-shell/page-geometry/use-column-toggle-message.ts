import { useCallback } from 'react'
import { foldedFullScreen } from '../../layout/folded-full-screen'
import { isColumnToggleMessage } from './page-column-toggle'

/** The page's messages, with the bar's full-screen toggle (page-column-toggle) taken out and acted on here. */
export function useColumnToggleMessage<E extends { nativeEvent: { json: string } }>(
  onPageMessage: (event: E) => void
): (event: E) => void {
  return useCallback(
    (event: E) => {
      if (isColumnToggleMessage(event.nativeEvent.json)) {
        foldedFullScreen.toggle()
        return
      }
      onPageMessage(event)
    },
    [onPageMessage]
  )
}
