import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useContext, type ReactNode } from 'react'
import type { EdgeInsets, Rect } from 'react-native-safe-area-context'
import type { CameraCorner } from './camera-corner'

vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: <T,>(styles: T) => styles },
  useWindowDimensions: () => ({ width: 466, height: 678 })
}))
vi.mock('react-native-safe-area-context', async () => {
  const { createContext, useContext } = await import('react')
  const SafeAreaInsetsContext = createContext<EdgeInsets | null>(null)
  const SafeAreaFrameContext = createContext<Rect | null>(null)
  return {
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
    useSafeAreaInsets: () => useContext(SafeAreaInsetsContext),
    useSafeAreaFrame: () => useContext(SafeAreaFrameContext)
  }
})
// The iPhone Duo cover screen, as in status-column.test.ts.
vi.mock('./reserved-regions', () => ({
  useReservedRegions: () => ({
    divisions: [],
    occlusions: [
      { x: 399.67, y: 29.33, width: 37, height: 37 },
      { x: 382, y: 0, width: 84, height: 174 }
    ]
  })
}))

const { SafeAreaFrameContext, SafeAreaInsetsContext, useSafeAreaFrame, useSafeAreaInsets } =
  await import('react-native-safe-area-context')
const { StatusColumnArea } = await import('./status-column-area')
const { CameraCornerContext } = await import('./camera-corner')

const WINDOW = { top: 0, right: 84, bottom: 34, left: 0 }
const FRAME = { x: 0, y: 0, width: 466, height: 678 }

let tree: ReactTestRenderer | undefined

function renderCover(hidden: boolean) {
  const read: { insets?: EdgeInsets; frame?: Rect; camera?: CameraCorner | null } = {}
  function Probe() {
    read.insets = useSafeAreaInsets()
    read.frame = useSafeAreaFrame()
    read.camera = useContext(CameraCornerContext)
    return null
  }
  act(() => {
    tree = create(
      <SafeAreaFrameContext.Provider value={FRAME}>
        <SafeAreaInsetsContext.Provider value={WINDOW}>
          <StatusColumnArea hidden={hidden}>
            <Probe />
          </StatusColumnArea>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    )
  })
  return read
}

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
})

describe('the app over the hidden status column', () => {
  it('hands screens the column, keeps the camera as a top inset and leaves the corner to rows', () => {
    const read = renderCover(true)
    const area = tree!.root.find((node) => String(node.type) === 'View')
    expect(Object.assign({}, ...[area.props.style].flat())).toMatchObject({ paddingBottom: 0 })
    expect(read.insets).toEqual({ top: 67, right: 0, bottom: 34, left: 0 })
    expect(read.frame).toEqual(FRAME)
    expect(read.camera).toEqual({
      side: 'right',
      windowWidth: 466,
      windowInsetTop: 0,
      x: 399.67,
      y: 29.33,
      width: 37,
      height: 37
    })
  })

  it('changes nothing while the column shows, in the same tree', () => {
    const read = renderCover(false)
    expect(tree!.root.findAll((node) => String(node.type) === 'View')).toHaveLength(1)
    expect(read.insets).toEqual(WINDOW)
    expect(read.frame).toEqual(FRAME)
    expect(read.camera).toBeNull()
  })
})
