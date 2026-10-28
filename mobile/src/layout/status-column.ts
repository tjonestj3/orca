import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context'
import type { ReservedRect } from '../../modules/orca-reserved-regions/src'
import { useReservedRegions } from './reserved-regions'
import { getSideRailStrip } from './side-rail-strip'
import type { CameraCorner } from './camera-corner'

/**
 * True once the window has shown an iPhone Duo status column: the status bar is then hidden,
 * which takes the column with it, so screens fill the window folded, open and in Split View, as
 * Moshi does. Remembered because hiding the column removes it from the insets this reads; other
 * phones and iPads never show one and keep their status bar.
 */
export function useHideStatusColumn(): boolean {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { occlusions } = useReservedRegions()
  const showsStatusColumn =
    getSideRailStrip({ windowWidth: width, windowHeight: height, insets, occlusions }) !== null
  const [hideStatusColumn, setHideStatusColumn] = useState(false)
  useEffect(() => {
    if (showsStatusColumn) {
      setHideStatusColumn(true)
    }
  }, [showsStatusColumn])
  return hideStatusColumn
}

type WindowGeometry = {
  windowWidth: number
  windowHeight: number
  insets: EdgeInsets
  occlusions: readonly ReservedRect[]
}

/** The status column's strip and any camera inside it (the cover screen's); null without a column. */
function statusColumnCameras(args: WindowGeometry) {
  const strip = getSideRailStrip(args)
  if (strip === null) {
    return null
  }
  const stripStart = strip.side === 'right' ? args.windowWidth - strip.width : 0
  const stripEnd = strip.side === 'right' ? args.windowWidth : strip.width
  // The column's own region spans its width; the cover screen's camera sits inside it.
  const cameras = args.occlusions.filter(
    (region) =>
      region.x >= stripStart - 1 &&
      region.x + region.width <= stripEnd + 1 &&
      region.width < strip.width - 1
  )
  return { strip, cameras }
}

function isInTopHalf(camera: ReservedRect, windowHeight: number): boolean {
  return camera.y + camera.height / 2 < windowHeight / 2
}

/**
 * The window insets with the hidden status column given back: iOS keeps its side inset after the
 * status bar hides, so screens would still stop short of it. Only a camera in the column stays
 * clear, as a top (bottom, turned over) inset like any iPhone's. The same insets without a column.
 */
export function insetsWithoutStatusColumn(args: WindowGeometry): EdgeInsets {
  const found = statusColumnCameras(args)
  if (found === null) {
    return args.insets
  }
  let { top, bottom } = args.insets
  for (const camera of found.cameras) {
    if (isInTopHalf(camera, args.windowHeight)) {
      top = Math.max(top, Math.ceil(camera.y + camera.height))
    } else {
      bottom = Math.max(bottom, Math.ceil(args.windowHeight - camera.y))
    }
  }
  return { ...args.insets, top, bottom, [found.strip.side]: 0 }
}

/**
 * The camera at the top of the hidden status column, which header rows keep clear of instead of
 * the whole screen starting below it. Null without a column or with the camera at the bottom.
 */
export function cameraCornerOfStatusColumn(args: WindowGeometry): CameraCorner | null {
  const found = statusColumnCameras(args)
  const camera = found?.cameras.find((region) => isInTopHalf(region, args.windowHeight))
  if (!found || !camera) {
    return null
  }
  return { side: found.strip.side, windowWidth: args.windowWidth, ...camera }
}
