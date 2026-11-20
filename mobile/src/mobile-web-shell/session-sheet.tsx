import { StyleSheet, View } from 'react-native'
import { useSessionPill } from '../theme/mobile-appearance'

// Moshi's look for a session: the page on a sheet a little below the top, its top corners rounded over a darker
// ground, a grab handle at its top edge. With the floating header (Settings → Appearance), which it goes with.
/** How far down the sheet puts the page: what the page measures, the window sees this much lower. */
export const SHEET_TOP = 10
const SHEET_RADIUS = 22

/** A session's sheet, or nulls when it isn't on one: the shell's root and page styles, and the handle to draw. */
export function useSessionSheet(showsSession: boolean) {
  const on = useSessionPill() && showsSession
  return {
    on,
    pageTop: on ? SHEET_TOP : 0,
    root: on ? styles.root : null,
    page: on ? styles.page : null,
    handle: on ? <View pointerEvents="none" style={styles.handle} /> : null
  }
}

const styles = StyleSheet.create({
  // Shows in the band above the sheet and past its corners.
  root: { backgroundColor: '#0b0c13' },
  page: {
    marginTop: SHEET_TOP,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: 'hidden'
  },
  handle: {
    position: 'absolute',
    top: SHEET_TOP + 6,
    left: '50%',
    width: 40,
    marginLeft: -20,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(230, 232, 245, 0.3)'
  }
})
