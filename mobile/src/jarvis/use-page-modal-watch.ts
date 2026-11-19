import { useCallback, useEffect } from 'react'
import type { NativeSyntheticEvent } from 'react-native'
import type { MobileWebShellBridgeMessagePayload } from '../../modules/orca-mobile-web-shell/src/index'
import { pageModals, readPageModalMessage } from './page-modal'

type BridgeMessage = NativeSyntheticEvent<MobileWebShellBridgeMessagePayload>

/** Reads the page's sheet-open messages for the Xeno orb and hands every other message on to Orca's bridge. */
export function usePageModalWatch(
  page: string | null,
  forward: (event: BridgeMessage) => void
): (event: BridgeMessage) => void {
  useEffect(() => (page === null ? undefined : () => pageModals.forget(page)), [page])
  return useCallback(
    (event: BridgeMessage) => {
      const open = readPageModalMessage(event.nativeEvent.json)
      if (open === null) {
        forward(event)
      } else if (page !== null) {
        pageModals.set(page, open)
      }
    },
    [forward, page]
  )
}
