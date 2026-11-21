import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useWindowDimensions, type LayoutChangeEvent, type HostInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useSideColumn,
  useSideRailStrip,
  useSideRailDirectionPadAvailable
} from '../../layout/side-rail'
import { pageOverColumn } from '../../layout/folded-full-screen'
import {
  pageOcclusions,
  type BridgePageGeometry
} from '../bridge/page-geometry/bridge-page-geometry'
import { getFoldSplit } from '../../layout/fold-division'
import { noteLayout, rect } from '../../layout/layout-notes'
import { useReservedRegions } from '../../layout/reserved-regions'
import type { BridgeFoldDivision } from '../bridge/page-geometry/bridge-fold-division'
import type { BridgeSafeAreaInsets } from '../bridge/page-geometry/bridge-safe-area-insets'
import { measuredPageSafeAreaInsets } from './page-safe-area-insets'

type WindowFrame = { x: number; y: number; width: number; height: number }

/**
 * The fold splitting the page's WebView, in the page's px. The regions come in window points, so
 * the view is measured in the window: `rootRef` and `onRootLayout` go on its container,
 * and `onShellLayout` on the WebView itself.
 */
export function usePageFoldDivision(options: { raiseTop?: boolean } = {}): {
  division: BridgeFoldDivision | null
  geometry: BridgePageGeometry
  safeAreaInsets: BridgeSafeAreaInsets
  raisedBy: number
  rootRef: RefObject<HostInstance | null>
  onRootLayout: () => void
  onShellLayout: (event: LayoutChangeEvent) => void
} {
  const { divisions, occlusions, windowSafeArea } = useReservedRegions()
  const strip = useSideRailStrip()
  const sideRail = strip !== null
  const directionPadAvailable = useSideRailDirectionPadAvailable()
  const rootRef = useRef<HostInstance>(null)
  const layoutRef = useRef<WindowFrame | null>(null)
  const [frame, setFrame] = useState<WindowFrame | null>(null)
  const measure = useCallback(() => {
    const layout = layoutRef.current
    if (layout === null) {
      return
    }
    const { x, y, width, height } = layout
    rootRef.current?.measureInWindow((rootX, rootY) => {
      const next = { x: rootX + x, y: rootY + y, width, height }
      noteLayout('page', { frame: rect(next) })
      setFrame((held) =>
        held !== null &&
        held.x === next.x &&
        held.y === next.y &&
        held.width === next.width &&
        held.height === next.height
          ? held
          : next
      )
    })
  }, [])
  const onShellLayout = useCallback(
    (event: LayoutChangeEvent) => {
      layoutRef.current = event.nativeEvent.layout
      measure()
    },
    [measure]
  )
  // A 180° turn moves the status column across and the root with it, without a new local layout.
  const windowSize = useWindowDimensions()
  const insets = useSafeAreaInsets()
  useEffect(measure, [
    measure,
    windowSize.width,
    windowSize.height,
    insets.left,
    insets.right,
    insets.top,
    windowSafeArea
  ])
  // A session full screen on the folded Duo: the page takes the column, its header clear of the camera.
  const column = useSideColumn()
  const measuredInsets = useMemo(
    () => measuredPageSafeAreaInsets(windowSafeArea, frame, insets),
    [windowSafeArea, frame, insets]
  )
  const overColumn = useMemo(
    () =>
      pageOverColumn({
        insets: measuredInsets,
        occlusions,
        column,
        windowWidth: windowSize.width,
        raiseTop: options.raiseTop
      }),
    [measuredInsets, occlusions, column, windowSize.width, options.raiseTop]
  )
  const split = frame === null ? null : getFoldSplit(divisions, frame)
  const axis = split?.axis
  const start = split?.start
  const end = split?.end
  const division = useMemo(
    () =>
      axis === undefined || start === undefined || end === undefined ? null : { axis, start, end },
    [axis, start, end]
  )
  const geometry = useMemo(
    () => ({
      sideRail,
      directionPadAvailable,
      occlusions: pageOcclusions(overColumn.occlusions, frame)
    }),
    [frame, overColumn.occlusions, sideRail, directionPadAvailable]
  )
  const safeAreaInsets = overColumn.insets
  // How far the top was raised to clear the camera, which a header beside a session's gives back (page-anchors).
  const raisedBy = Math.max(0, overColumn.insets.top - measuredInsets.top)
  // What the page is told, for the log (layout-notes): a page narrower than its frame is the page's own doing.
  useEffect(() => {
    const i = safeAreaInsets
    noteLayout('page-told', {
      frame: rect(frame),
      insets: `t${Math.round(i.top)} r${Math.round(i.right)} b${Math.round(i.bottom)} l${Math.round(i.left)}`,
      division: division
        ? `${division.axis} ${Math.round(division.start)}-${Math.round(division.end)}`
        : 'none',
      rail: sideRail,
      occlusions: geometry.occlusions.map(rect).join(' | '),
      raiseTop: options.raiseTop === true
    })
  }, [frame, safeAreaInsets, division, sideRail, geometry.occlusions, options.raiseTop])
  return {
    division,
    geometry,
    safeAreaInsets,
    raisedBy,
    rootRef,
    onRootLayout: measure,
    onShellLayout
  }
}

/** Hands a moved fold to the page over the re-sent `init`, as the insets are. */
export function usePublishedFoldDivision(
  publish: (division: BridgeFoldDivision | null) => void,
  division: BridgeFoldDivision | null
): void {
  useEffect(() => {
    publish(division)
  }, [publish, division])
}
