import { useCallback, useEffect, useRef } from 'react'
import type { NativeSyntheticEvent } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useScreenLeaving } from '../navigation/use-screen-leaving'
import type { MobileWebShellBridgeMessagePayload } from '../../modules/orca-mobile-web-shell/src/index'
import { pageModals, readPageModalMessage } from './page-modal'
import {
  pageAnchors,
  readPageAnchorMessage,
  type PageAnchor,
  type PageAnchorName
} from './page-anchors'

type BridgeMessage = NativeSyntheticEvent<MobileWebShellBridgeMessagePayload>

/**
 * Reads the page's notes for Xeno's orb (a sheet open, where its anchors are) and hands every other message on to
 * Orca's bridge. The anchors count only while this screen is the one showing.
 */
export function usePageModalWatch(
  page: string | null,
  forward: (event: BridgeMessage) => void
): (event: BridgeMessage) => void {
  const anchors = useRef<Partial<Record<PageAnchorName, PageAnchor>>>({})
  const focused = useRef(false)
  useEffect(() => (page === null ? undefined : () => pageModals.forget(page)), [page])
  useEffect(() => {
    anchors.current = {} // a new page reports its own
  }, [page])
  const leaving = useScreenLeaving()
  useEffect(() => {
    if (page !== null) {
      pageAnchors.leave(page, leaving)
    }
  }, [page, leaving])
  useFocusEffect(
    useCallback(() => {
      focused.current = true
      if (page !== null) {
        pageAnchors.show(page, anchors.current)
      }
      return () => {
        focused.current = false
        if (page !== null) {
          pageAnchors.forget(page)
        }
      }
    }, [page])
  )
  return useCallback(
    (event: BridgeMessage) => {
      const json = event.nativeEvent.json
      const open = readPageModalMessage(json)
      const anchor = open === null ? readPageAnchorMessage(json) : null
      if (open === null && anchor === null) {
        forward(event)
      } else if (page !== null && open !== null) {
        pageModals.set(page, open)
      } else if (page !== null && anchor !== null) {
        const next = { ...anchors.current, [anchor.name]: anchor.at ?? undefined }
        anchors.current = next
        if (focused.current) {
          pageAnchors.show(page, next)
        }
      }
    },
    [forward, page]
  )
}
