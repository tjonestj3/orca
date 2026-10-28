import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context'
import type { ReservedRect } from '../../modules/orca-reserved-regions/src'
import { useReservedRegions } from './reserved-regions'
import { getSideRailStrip } from './side-rail-strip'

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

/**
 * The window insets with the hidden status column given back: iOS keeps its side inset after the
 * status bar hides, so screens would still stop short of it. Only a camera in the column stays
 * clear, as a top (bottom, turned over) inset like any iPhone's. The same insets without a column.
 */
export function insetsWithoutStatusColumn(args: {
  windowWidth: number
  windowHeight: number
  insets: EdgeInsets
  occlusions: readonly ReservedRect[]
}): EdgeInsets {
  const { windowWidth, windowHeight, insets, occlusions } = args
  const strip = getSideRailStrip(args)
  if (strip === null) {
    return insets
  }
  const stripStart = strip.side === 'right' ? windowWidth - strip.width : 0
  const stripEnd = strip.side === 'right' ? windowWidth : strip.width
  // The column's own region spans its width; the cover screen's camera sits inside it.
  const cameras = occlusions.filter(
    (region) =>
      region.x >= stripStart - 1 &&
      region.x + region.width <= stripEnd + 1 &&
      region.width < strip.width - 1
  )
  let { top, bottom } = insets
  for (const camera of cameras) {
    if (camera.y + camera.height / 2 < windowHeight / 2) {
      top = Math.max(top, Math.ceil(camera.y + camera.height))
    } else {
      bottom = Math.max(bottom, Math.ceil(windowHeight - camera.y))
    }
  }
  return { ...insets, top, bottom, [strip.side]: 0 }
}
