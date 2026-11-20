import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ColumnToggleButton } from '../layout/column-toggle'
import { useSideColumn, useSideColumnFullScreen } from '../layout/side-rail'
import { useScreenLeaving } from '../navigation/use-screen-leaving'

/**
 * While this screen is the one showing, it may take the folded Duo's status column. A screen whose
 * header the app doesn't draw (a session is the desktop's page) gets the column's own toggle.
 */
export function useSessionFullScreen(
  options: { enabled?: boolean; columnToggle?: boolean; snap?: boolean } = {}
) {
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )
  // The toggle is drawn over the whole window: it goes as this screen starts to leave, or it would hang over the
  // screen sliding in. Full screen itself stays until it has gone, so the column doesn't come back mid-swipe.
  const leaving = useScreenLeaving()
  useSideColumnFullScreen(focused && options.enabled !== false, {
    columnToggle: options.columnToggle === true && !leaving,
    snap: options.snap
  })
}

/**
 * A header's button for the folded Duo: full screen, with the keys in the bottom row, or the status
 * column back with the keys and Xeno in it. Settings → Terminal sets which it starts as.
 */
export function SideColumnToggle() {
  const column = useSideColumn()
  return column ? <ColumnToggleButton side={column.side} extended={column.extended} /> : null
}
