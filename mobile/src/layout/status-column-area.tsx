import { useMemo, type ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  useSafeAreaFrame,
  useSafeAreaInsets
} from 'react-native-safe-area-context'
import { useReservedRegions } from './reserved-regions'
import { insetsWithoutStatusColumn } from './status-column'

/**
 * Lays the app out over the hidden iPhone Duo status column. A camera in it is padded out here
 * rather than handed down, as header SafeAreaViews measure the native inset, which has none for it.
 */
export function StatusColumnArea({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const frame = useSafeAreaFrame()
  const { occlusions } = useReservedRegions()
  const clear = useMemo(
    () =>
      hidden
        ? insetsWithoutStatusColumn({
            windowWidth: width,
            windowHeight: height,
            insets,
            occlusions
          })
        : insets,
    [hidden, width, height, insets, occlusions]
  )
  const padTop = clear.top > insets.top ? clear.top : 0
  const padBottom = clear.bottom > insets.bottom ? clear.bottom : 0
  const areaInsets = useMemo(
    () => ({
      ...clear,
      top: padTop > 0 ? 0 : clear.top,
      bottom: padBottom > 0 ? 0 : clear.bottom
    }),
    [clear, padTop, padBottom]
  )
  const areaFrame = useMemo(
    () => ({
      ...frame,
      y: frame.y + padTop,
      height: Math.max(0, frame.height - padTop - padBottom)
    }),
    [frame, padTop, padBottom]
  )
  if (clear === insets) {
    return children
  }
  return (
    <View style={[styles.area, { paddingTop: padTop, paddingBottom: padBottom }]}>
      <SafeAreaFrameContext.Provider value={areaFrame}>
        <SafeAreaInsetsContext.Provider value={areaInsets}>
          {children}
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </View>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 }
})
