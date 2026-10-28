import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
