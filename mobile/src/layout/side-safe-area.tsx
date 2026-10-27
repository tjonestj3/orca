import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { colors } from '../theme/mobile-theme'
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
  type EdgeInsets
} from 'react-native-safe-area-context'

const WindowSafeAreaInsetsContext = createContext<EdgeInsets | null>(null)

// Pad side cutouts/navigation bars once, then expose the padded frame and insets so descendants neither pad twice nor size past it.
export function SideSafeArea({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const frame = useSafeAreaFrame()
  const areaInsets = useMemo(() => ({ ...insets, left: 0, right: 0 }), [insets])
  const areaFrame = useMemo(
    () => ({
      ...frame,
      x: frame.x + insets.left,
      width: Math.max(0, frame.width - insets.left - insets.right)
    }),
    [frame, insets.left, insets.right]
  )
  const area = (
    <WindowSafeAreaInsetsContext.Provider value={insets}>
      <SafeAreaFrameContext.Provider value={areaFrame}>
        <SafeAreaInsetsContext.Provider value={areaInsets}>
          {children}
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </WindowSafeAreaInsetsContext.Provider>
  )
  // Native SafeAreaView measures its nearest native provider, so nest one inside the padding; web reads the adjusted context.
  return (
    <View style={[styles.area, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* Side strips (the iPhone Duo's status column) in the panel color, so they read as app, not a bar. */}
      {insets.left > 0 ? <View style={[styles.strip, { left: 0, width: insets.left }]} /> : null}
      {insets.right > 0 ? <View style={[styles.strip, { right: 0, width: insets.right }]} /> : null}
      {Platform.OS === 'web' ? area : <SafeAreaProvider>{area}</SafeAreaProvider>}
    </View>
  )
}

// Modals own a separate window outside SideSafeArea and need the original window insets.
export function useWindowSafeAreaInsets(): EdgeInsets {
  const insets = useSafeAreaInsets()
  return useContext(WindowSafeAreaInsetsContext) ?? insets
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  strip: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.bgPanel }
})
