import { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, PanResponder, Platform } from 'react-native'
import { useGlobalSearchParams, usePathname } from 'expo-router'
import { colors } from '../../src/theme/mobile-theme'
import { useResponsiveLayout } from '../../src/layout/responsive-layout'
import { useFoldSplit } from '../../src/layout/use-fold-split'
import {
  HOST_SIDEBAR_DEFAULT_WIDTH,
  HOST_SIDEBAR_MAX_WIDTH,
  HOST_SIDEBAR_MIN_WIDTH,
  loadHostSidebarWidth,
  saveHostSidebarWidth
} from '../../src/storage/preferences'
import { HostProtocolGate } from '../../src/components/HostProtocolGate'
import { HostScreen } from '../../src/host-screen/HostScreen'
import { HostStack } from '../../src/navigation/host-stack'
import { HostSidebarRevealContext } from '../../src/layout/host-sidebar-reveal'
import { HostAreaServingContext } from '../../src/mobile-web-shell/host-area-serving'
import { usePageOwnsHostArea } from '../../src/mobile-web-shell/page-owns-host-area'
import { isOverlayPageRoute } from '../../src/new-workspace/overlay-page-route'
import { useHostSideNavRail } from '../../src/layout/side-nav-rail'

// Keep at least this much room for the detail pane when resizing the sidebar.
const MIN_DETAIL_WIDTH = 320
const RESIZE_EDGE_WIDTH = 36
// A drag released this close to the fold snaps back to it.
const FOLD_SNAP_DISTANCE = 16

// Clamp restored sidebar width to current window so a smaller device retains usable detail space.
function clampSidebarToWindow(width: number, windowWidth: number): number {
  const hardMax = Math.max(
    HOST_SIDEBAR_MIN_WIDTH,
    Math.min(HOST_SIDEBAR_MAX_WIDTH, windowWidth - MIN_DETAIL_WIDTH)
  )
  return Math.min(hardMax, Math.max(HOST_SIDEBAR_MIN_WIDTH, Math.round(width)))
}

export default function HostGroupLayout() {
  // Wide layout = tablet/foldable canvas (see responsive-layout-metrics).
  const { isWideLayout, width: windowWidth } = useResponsiveLayout()
  const { hostId, worktreeId } = useGlobalSearchParams<{ hostId?: string; worktreeId?: string }>()
  const pathname = usePathname()
  const overlayRoute = isOverlayPageRoute(pathname)
  // Folded only: unfolded, the sidebar already holds this navigation.
  useHostSideNavRail(isWideLayout ? undefined : hostId, worktreeId)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(HOST_SIDEBAR_DEFAULT_WIDTH)

  // Refs keep once-created PanResponder handlers reading current widths.
  const widthRef = useRef(sidebarWidth)
  widthRef.current = sidebarWidth
  const windowWidthRef = useRef(windowWidth)
  windowWidthRef.current = windowWidth
  const dragStartRef = useRef(sidebarWidth)
  // Sidebar follows the fold until the user drags it elsewhere.
  const [foldPinned, setFoldPinned] = useState(true)
  const foldWidthRef = useRef<number | null>(null)

  useEffect(() => {
    let stale = false
    void loadHostSidebarWidth().then((saved) => {
      if (!stale) {
        setSidebarWidth(clampSidebarToWindow(saved, windowWidthRef.current))
      }
    })
    return () => {
      stale = true
    }
  }, [])

  // Re-clamp on fold/rotation/split-screen to preserve MIN_DETAIL_WIDTH.
  useEffect(() => {
    setSidebarWidth((current) => clampSidebarToWindow(current, windowWidth))
  }, [windowWidth])

  const hideSidebar = useCallback(() => setSidebarOpen(false), [])
  const revealSidebar = useCallback(() => setSidebarOpen(true), [])
  const [hostAreaServing, setHostAreaServing] = useState(false)
  const pageOwnsHostArea = usePageOwnsHostArea()
  // One owner: the page only with its init fact; natively all but a host route its page is serving.
  const sidebarDrawnHere =
    Platform.OS === 'web' ? pageOwnsHostArea : !(pathname === `/h/${hostId}` && hostAreaServing)
  const showSidebar = isWideLayout && !!hostId && sidebarDrawnHere
  const detailHasContent = !!hostId && pathname !== `/h/${hostId}`
  // Book posture: the sidebar takes the half before the fold and the detail the half after it, so
  // the terminal never runs across the crease.
  const foldSplit = useFoldSplit()
  const foldCandidateWidth =
    showSidebar &&
    foldSplit?.axis === 'vertical' &&
    foldSplit.start >= HOST_SIDEBAR_MIN_WIDTH &&
    foldSplit.size - foldSplit.end >= MIN_DETAIL_WIDTH
      ? foldSplit.start
      : null
  foldWidthRef.current = foldCandidateWidth
  const foldSidebarWidth = foldPinned ? foldCandidateWidth : null
  // Drags start from the width on screen, which is the fold's while pinned.
  widthRef.current = foldSidebarWidth ?? sidebarWidth
  const foldGap = foldSidebarWidth === null || !foldSplit ? 0 : foldSplit.end - foldSplit.start
  const canCollapseSidebar = showSidebar && detailHasContent && foldSidebarWidth === null
  const sidebarShown = showSidebar && (sidebarOpen || foldSidebarWidth !== null)

  // Base host detail is a placeholder; hiding its sidebar would leave nothing useful.
  useEffect(() => {
    if (showSidebar && !detailHasContent) {
      setSidebarOpen(true)
    }
  }, [detailHasContent, showSidebar])

  // Use an overlaid leaf drag handle: Android ScrollView/FlatList captures touches before a parent PanResponder.
  // Claim start/capture because nothing lies beneath the handle; keep it off the sidebar container.
  const settleDrag = () => {
    const foldWidth = foldWidthRef.current
    if (foldWidth !== null && Math.abs(widthRef.current - foldWidth) <= FOLD_SNAP_DISTANCE) {
      setFoldPinned(true)
      return
    }
    void saveHostSidebarWidth(widthRef.current)
  }
  const resizer = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartRef.current = widthRef.current
      },
      onPanResponderMove: (_evt, g) => {
        setFoldPinned(false)
        setSidebarWidth(clampSidebarToWindow(dragStartRef.current + g.dx, windowWidthRef.current))
      },
      onPanResponderRelease: () => {
        settleDrag()
      },
      onPanResponderTerminate: () => {
        settleDrag()
      }
    })
  ).current

  // Keep detail Stack at a stable tree position so fold/rotation cannot remount navigation.
  return (
    <HostProtocolGate hostId={hostId} transparentWhilePending={overlayRoute}>
      <View style={[styles.row, overlayRoute && styles.transparent]}>
        {sidebarShown ? (
          <View style={[styles.sidebar, { width: foldSidebarWidth ?? sidebarWidth }]}>
            <HostScreen
              embedded
              hostId={hostId}
              onHideSidebar={canCollapseSidebar ? hideSidebar : undefined}
            />
          </View>
        ) : null}
        {foldGap > 0 ? <View style={{ width: foldGap }} /> : null}
        <View style={styles.detail}>
          <HostAreaServingContext.Provider value={setHostAreaServing}>
            <HostSidebarRevealContext.Provider
              value={
                showSidebar && !sidebarOpen && foldSidebarWidth === null ? revealSidebar : null
              }
            >
              <HostStack animation={showSidebar ? 'none' : 'default'} swipeBack={!sidebarShown} />
            </HostSidebarRevealContext.Provider>
          </HostAreaServingContext.Provider>
        </View>
        {/* Above both panes and straddling their seam, so a drag never starts in the detail stack;
            dragging also unpins the sidebar from the fold. */}
        {sidebarShown ? (
          <View
            style={[
              styles.resizeHandle,
              { left: (foldSidebarWidth ?? sidebarWidth) - RESIZE_EDGE_WIDTH / 2 }
            ]}
            {...resizer.panHandlers}
          >
            <View style={styles.resizeGrip} />
          </View>
        ) : null}
      </View>
    </HostProtocolGate>
  )
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bgBase
  },
  transparent: {
    backgroundColor: 'transparent'
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle
  },
  // Elevated edge strip must sit above list to own Android drags.
  resizeHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: RESIZE_EDGE_WIDTH,
    zIndex: 20,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Shows where to grab; the handle itself is wider than it looks.
  resizeGrip: {
    width: 4,
    height: 48,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle
  },
  detail: {
    flex: 1,
    minWidth: 0
  }
})
