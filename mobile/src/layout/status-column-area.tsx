import { useMemo, type ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  useSafeAreaFrame,
  useSafeAreaInsets
} from 'react-native-safe-area-context'
import { CameraCornerContext } from './camera-corner'
import { useReservedRegions } from './reserved-regions'
import { cameraCornerOfStatusColumn, insetsWithoutStatusColumn } from './status-column'

/**
 * Lays the app out over the hidden iPhone Duo status column. Header SafeAreaViews measure the
 * native top inset, which has none for the cover screen's camera, so their screens run up under it
 * as Moshi's do and their rows keep clear of its corner (`ClearOfCamera`). Screens that pad by the
 * insets in context are handed the camera as a top inset instead. A camera at the bottom, turned
 * over, is padded out here.
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
  const camera = useMemo(
    () =>
      hidden
        ? cameraCornerOfStatusColumn({
            windowWidth: width,
            windowHeight: height,
            insets,
            occlusions
          })
        : null,
    [hidden, width, height, insets, occlusions]
  )
  const padBottom = clear.bottom > insets.bottom ? clear.bottom : 0
  const areaInsets = useMemo(
    () => ({ ...clear, bottom: padBottom > 0 ? 0 : clear.bottom }),
    [clear, padBottom]
  )
  const areaFrame = useMemo(
    () => ({ ...frame, height: Math.max(0, frame.height - padBottom) }),
    [frame, padBottom]
  )
  // One tree whatever the insets: iOS reports the cover screen with and without the column while the
  // app comes back from the background, and swapping wrappers would remount every screen and reset
  // the navigation (the workspace, Floating Workspace and tab on show) to its launch route.
  return (
    <View style={[styles.area, { paddingBottom: padBottom }]}>
      <CameraCornerContext.Provider value={camera}>
        <SafeAreaFrameContext.Provider value={areaFrame}>
          <SafeAreaInsetsContext.Provider value={areaInsets}>
            {children}
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </CameraCornerContext.Provider>
    </View>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 }
})
