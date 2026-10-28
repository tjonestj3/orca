import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

/** A camera at the top of the window, in window points, and the side of the window it sits on. */
export type CameraCorner = {
  side: 'left' | 'right'
  windowWidth: number
  /** The window's top inset from iOS, which has none for the camera. */
  windowInsetTop: number
  x: number
  y: number
  width: number
  height: number
}

/** Room kept between a row's controls and the camera. */
const CAMERA_GAP = 8

/**
 * The iPhone Duo cover screen's camera once its status column is hidden. Screens run up under it
 * across the width, as Moshi's do, and only the rows beside it keep clear of its corner.
 */
export const CameraCornerContext = createContext<CameraCorner | null>(null)

/**
 * How far in from its camera side a full-width row must keep its controls; 0 when the row passes
 * beside none of it. Only the row's height is measured: a screen sliding in has it offset sideways.
 */
export function cameraClearance(camera: CameraCorner, row: { y: number; height: number }): number {
  if (row.y >= camera.y + camera.height + CAMERA_GAP || row.y + row.height <= camera.y) {
    return 0
  }
  return Math.ceil(
    camera.side === 'right'
      ? camera.windowWidth - camera.x + CAMERA_GAP
      : camera.x + camera.width + CAMERA_GAP
  )
}

/**
 * A view whose content keeps clear of the camera corner while it sits beside it: a header row
 * moves its trailing buttons in rather than the whole screen moving down. Padding on the camera
 * side replaces the style's own there, as the clearance is measured from the view's edge.
 */
export function ClearOfCamera({
  style,
  children
}: {
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const camera = useContext(CameraCornerContext)
  const ref = useRef<View>(null)
  const [clearance, setClearance] = useState(0)
  const measure = useCallback(() => {
    if (camera === null) {
      setClearance(0)
      return
    }
    ref.current?.measureInWindow?.((_x, y, _width, height) => {
      setClearance(cameraClearance(camera, { y, height }))
    })
  }, [camera])
  useEffect(measure, [measure])
  const pad =
    camera === null || clearance === 0
      ? null
      : camera.side === 'right'
        ? { paddingRight: clearance }
        : { paddingLeft: clearance }
  return (
    <View ref={ref} onLayout={measure} style={pad ? [style, pad] : style}>
      {children}
    </View>
  )
}
