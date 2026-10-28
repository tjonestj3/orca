import { useContext, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraCornerContext, ClearOfCamera } from './camera-corner'

/**
 * A SafeAreaView for a screen's top edge. Over the hidden iPhone Duo status column, iOS gives screens
 * in nested stacks a top inset for the cover screen's camera though the root's have none, so there it
 * pads by the window's own top inset instead: the header runs up under the camera, as Moshi's does,
 * and its rows keep clear of the corner (`ClearOfCamera`), or with `clearCamera` the whole header.
 */
export function TopSafeAreaView({
  style,
  clearCamera = false,
  children
}: {
  style?: StyleProp<ViewStyle>
  clearCamera?: boolean
  children: ReactNode
}) {
  const camera = useContext(CameraCornerContext)
  if (camera === null) {
    return (
      <SafeAreaView style={style} edges={['top']}>
        {children}
      </SafeAreaView>
    )
  }
  const padded = [style, { paddingTop: camera.windowInsetTop }]
  return clearCamera ? (
    <ClearOfCamera style={padded}>{children}</ClearOfCamera>
  ) : (
    <View style={padded}>{children}</View>
  )
}
