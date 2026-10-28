import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { ReservedRegions } from '../../modules/orca-reserved-regions/src'

type Geometry = {
  window: { width: number; height: number }
  insets: { top: number; right: number; bottom: number; left: number }
  regions: ReservedRegions
}

const state = vi.hoisted(() => ({ geometry: null as unknown as Geometry }))

vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: <T,>(styles: T) => styles },
  useWindowDimensions: () => state.geometry.window
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => state.geometry.insets
}))
vi.mock('./reserved-regions', () => ({ useReservedRegions: () => state.geometry.regions }))
vi.mock('../platform/keyboard-occlusion', () => ({ useKeyboardOcclusion: () => 0 }))

const { SideRailProvider, useSideRailContent, useSideStripExtendedSide } =
  await import('./side-rail')

// The iPhone Duo cover screen, measured on the simulator (iOS 27.1): status column and camera.
const DUO_COVER: Geometry = {
  window: { width: 466, height: 678 },
  insets: { top: 0, right: 84, bottom: 34, left: 0 },
  regions: {
    divisions: [],
    occlusions: [
      { x: 399.67, y: 29.33, width: 37, height: 37 },
      { x: 382, y: 0, width: 84, height: 174 }
    ]
  }
}
const IPHONE_PORTRAIT: Geometry = {
  window: { width: 402, height: 874 },
  insets: { top: 62, right: 0, bottom: 34, left: 0 },
  regions: { divisions: [], occlusions: [] }
}

let tree: ReactTestRenderer | undefined
let extended: ReturnType<typeof useSideStripExtendedSide> | undefined
let setRail: (shown: boolean) => void = () => undefined

function Probe() {
  extended = useSideStripExtendedSide()
  return null
}

function Rail() {
  const [shown, setShown] = useState(false)
  setRail = setShown
  useSideRailContent(shown ? 'keys' : null)
  return null
}

function render(geometry: Geometry) {
  state.geometry = geometry
  act(() => {
    const app = (
      <SideRailProvider>
        <Rail />
        <Probe />
      </SideRailProvider>
    )
    if (tree) {
      tree.update(app)
    } else {
      tree = create(app)
    }
  })
}

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
  extended = undefined
})

describe('an empty iPhone Duo status column', () => {
  it('is given to the screens while nothing draws a rail in it', () => {
    render(DUO_COVER)
    expect(extended).toBe('right')
  })

  it('is kept for a rail, and given back once the rail goes', () => {
    render(DUO_COVER)
    act(() => setRail(true))
    expect(extended).toBeNull()
    act(() => setRail(false))
    expect(extended).toBe('right')
  })

  it('stays given while iOS stops reporting its inset', () => {
    render(DUO_COVER)
    render({ ...DUO_COVER, insets: { ...DUO_COVER.insets, right: 0 } })
    expect(extended).toBe('right')
  })

  it('leaves a phone without a status column alone', () => {
    render(IPHONE_PORTRAIT)
    expect(extended).toBeNull()
  })
})
