import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ View: 'View' }))
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))

const { CameraCornerContext } = await import('./camera-corner')
const { TopSafeAreaView } = await import('./top-safe-area-view')

// The iPhone Duo cover screen's camera, as in status-column.test.ts.
const CAMERA = {
  side: 'right' as const,
  windowWidth: 466,
  windowInsetTop: 0,
  x: 399.67,
  y: 29.33,
  width: 37,
  height: 37
}

let tree: ReactTestRenderer | undefined

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
})

function render(camera: typeof CAMERA | null) {
  act(() => {
    tree = create(
      <CameraCornerContext.Provider value={camera}>
        <TopSafeAreaView style={{ backgroundColor: 'grey' }}>{null}</TopSafeAreaView>
      </CameraCornerContext.Provider>
    )
  })
  return tree!.root.children[0] as { type: unknown; props: Record<string, unknown> }
}

describe('TopSafeAreaView', () => {
  it('pads by the native top inset on any other screen', () => {
    const view = render(null)
    expect(view.type).toBe('SafeAreaView')
    expect(view.props.edges).toEqual(['top'])
  })

  it('runs up under the cover screen camera, padding only the window top inset', () => {
    const view = render(CAMERA)
    expect(view.type).toBe('View')
    expect(Object.assign({}, ...[view.props.style].flat(2))).toEqual({
      backgroundColor: 'grey',
      paddingTop: 0
    })
  })
})
