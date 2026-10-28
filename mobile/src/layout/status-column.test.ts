import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReservedRect } from '../../modules/orca-reserved-regions/src'

type Geometry = {
  window: { width: number; height: number }
  insets: { top: number; right: number; bottom: number; left: number }
  occlusions: ReservedRect[]
}

let geometry: Geometry

vi.mock('react-native', () => ({ useWindowDimensions: () => geometry.window }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => geometry.insets }))
vi.mock('./reserved-regions', () => ({
  useReservedRegions: () => ({ divisions: [], occlusions: geometry.occlusions })
}))

const { useHideStatusColumn } = await import('./status-column')

// Measured on the iPhone Duo simulator (iOS 27.1), as in side-rail-strip.test.ts.
const DUO_COVER_WITH_COLUMN: Geometry = {
  window: { width: 466, height: 678 },
  insets: { top: 0, right: 84, bottom: 34, left: 0 },
  occlusions: [
    { x: 399.67, y: 29.33, width: 37, height: 37 },
    { x: 382, y: 0, width: 84, height: 174 }
  ]
}
const DUO_COVER_WITHOUT_COLUMN: Geometry = {
  window: { width: 466, height: 678 },
  insets: { top: 0, right: 0, bottom: 34, left: 0 },
  occlusions: [{ x: 399.67, y: 29.33, width: 37, height: 37 }]
}
const IPHONE_PORTRAIT: Geometry = {
  window: { width: 402, height: 874 },
  insets: { top: 62, right: 0, bottom: 34, left: 0 },
  occlusions: []
}

let renderer: ReactTestRenderer | null = null
let hidden: boolean | null = null

function Probe() {
  hidden = useHideStatusColumn()
  return null
}

function render(next: Geometry) {
  geometry = next
  act(() => {
    if (renderer) {
      renderer.update(createElement(Probe))
    } else {
      renderer = create(createElement(Probe))
    }
  })
}

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = null
  hidden = null
})

describe('useHideStatusColumn', () => {
  it('hides the status bar once the iPhone Duo status column shows', () => {
    render(DUO_COVER_WITH_COLUMN)
    expect(hidden).toBe(true)
  })

  it('keeps it hidden after the column, and its inset, are gone', () => {
    render(DUO_COVER_WITH_COLUMN)
    render(DUO_COVER_WITHOUT_COLUMN)
    expect(hidden).toBe(true)
  })

  it('leaves the status bar alone on a phone without a status column', () => {
    render(IPHONE_PORTRAIT)
    expect(hidden).toBe(false)
  })
})
