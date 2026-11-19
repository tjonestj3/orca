import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ColumnToggleButton } from '../layout/column-toggle'
import { useSideColumn, useSideColumnFullScreen } from '../layout/side-rail'

/**
 * While this screen is the one showing, it may take the folded Duo's status column. A screen whose
 * header the app doesn't draw (a session is the desktop's page) gets the column's own toggle.
 */
export function useSessionFullScreen(options: { enabled?: boolean; columnToggle?: boolean } = {}) {
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )
  useSideColumnFullScreen(focused && options.enabled !== false, {
    columnToggle: options.columnToggle
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
