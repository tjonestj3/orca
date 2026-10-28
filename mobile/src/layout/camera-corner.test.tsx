import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', async () => {
  const { forwardRef, createElement, useImperativeHandle } = await import('react')
  return {
    View: forwardRef(function View(props: Record<string, unknown>, ref) {
      useImperativeHandle(ref, () => ({
        measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
          callback(0, rowTop, 466, 44)
      }))
      return createElement('View', props)
    })
  }
})

let rowTop = 0
const { CameraCornerContext, ClearOfCamera, cameraClearance } = await import('./camera-corner')

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

describe('cameraClearance', () => {
  it('keeps a row beside the camera clear of its corner', () => {
    expect(cameraClearance(CAMERA, { y: 0, height: 44 })).toBe(75)
    expect(cameraClearance(CAMERA, { y: 44, height: 44 })).toBe(75)
  })

  it('leaves rows below the camera alone', () => {
    expect(cameraClearance(CAMERA, { y: 88, height: 44 })).toBe(0)
  })

  it('clears from the left with the camera on the left', () => {
    expect(cameraClearance({ ...CAMERA, side: 'left', x: 29.33 }, { y: 0, height: 44 })).toBe(75)
  })
})

let tree: ReactTestRenderer | undefined

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
})

function paddingOf(camera: typeof CAMERA | null) {
  act(() => {
    tree = create(
      <CameraCornerContext.Provider value={camera}>
        <ClearOfCamera style={{ paddingHorizontal: 8 }}>{null}</ClearOfCamera>
      </CameraCornerContext.Provider>
    )
  })
  const view = tree!.root.find((node) => node.type === 'View')
  return Object.assign({}, ...[view.props.style].flat())
}

describe('ClearOfCamera', () => {
  it('pads its camera side while beside the camera', () => {
    rowTop = 0
    expect(paddingOf(CAMERA)).toEqual({ paddingHorizontal: 8, paddingRight: 75 })
  })

  it('keeps its own padding below the camera or without one', () => {
    rowTop = 120
    expect(paddingOf(CAMERA)).toEqual({ paddingHorizontal: 8 })
    rowTop = 0
    expect(paddingOf(null)).toEqual({ paddingHorizontal: 8 })
  })
})
