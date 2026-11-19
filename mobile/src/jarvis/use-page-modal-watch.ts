import { useCallback, useEffect, useRef } from 'react'
import type { NativeSyntheticEvent } from 'react-native'
import { useFocusEffect } from 'expo-router'
import type { MobileWebShellBridgeMessagePayload } from '../../modules/orca-mobile-web-shell/src/index'
import { pageModals, readPageModalMessage } from './page-modal'
import { pageHeaders, readPageHeaderMessage, type PageHeaderButton } from './page-header'

type BridgeMessage = NativeSyntheticEvent<MobileWebShellBridgeMessagePayload>

/**
 * Reads the page's notes for Xeno's orb (a sheet open, where its header's button is) and hands every other message
 * on to Orca's bridge. The header's button counts only while this screen is the one showing.
 */
export function usePageModalWatch(
  page: string | null,
  forward: (event: BridgeMessage) => void
): (event: BridgeMessage) => void {
  const header = useRef<PageHeaderButton | null>(null)
  const focused = useRef(false)
  useEffect(() => (page === null ? undefined : () => pageModals.forget(page)), [page])
  useFocusEffect(
    useCallback(() => {
      focused.current = true
      if (page !== null) {
        pageHeaders.set(page, header.current)
      }
      return () => {
        focused.current = false
        if (page !== null) {
          pageHeaders.forget(page)
        }
      }
    }, [page])
  )
  return useCallback(
    (event: BridgeMessage) => {
      const json = event.nativeEvent.json
      const open = readPageModalMessage(json)
      const button = open === null ? readPageHeaderMessage(json) : undefined
      if (open === null && button === undefined) {
        forward(event)
      } else if (page !== null && open !== null) {
        pageModals.set(page, open)
      } else if (page !== null && button !== undefined) {
        header.current = button
        if (focused.current) {
          pageHeaders.set(page, button)
        }
      }
    },
    [forward, page]
  )
}
