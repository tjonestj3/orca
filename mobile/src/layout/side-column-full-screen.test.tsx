import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined }
}))

const { SideRailProvider, useSideColumn, useSideColumnFullScreen, useSideRailStrip } =
  await import('./side-rail')
const { foldedFullScreen } = await import('./folded-full-screen')

// The iPhone Duo cover screen, measured on the simulator (iOS 27.1): status column and camera.
const DUO_FOLDED: Geometry = {
  window: { width: 466, height: 678 },
  insets: { top: 0, right: 84, bottom: 34, left: 0 },
  regions: {
    divisions: [],
    occlusions: [
      { x: 399.67, y: 29.33, width: 37, height: 37 },
      { x: 382, y: 0, width: 84, height: 174 }
    ],
    // The device has a fold, so iOS reports it (inactive) on the cover screen too.
    hasFoldDivision: true
  }
}
const DUO_UNFOLDED: Geometry = {
  ...DUO_FOLDED,
  window: { width: 951, height: 669 },
  insets: { top: 0, right: 84, bottom: 20, left: 0 },
  regions: {
    ...DUO_FOLDED.regions,
    occlusions: [{ x: 867, y: 0, width: 84, height: 174 }]
  }
}
const IPHONE_PORTRAIT: Geometry = {
  window: { width: 402, height: 874 },
  insets: { top: 62, right: 0, bottom: 34, left: 0 },
  regions: { divisions: [], occlusions: [] }
}

let tree: ReactTestRenderer | undefined
let seen: {
  strip: ReturnType<typeof useSideRailStrip>
  column: ReturnType<typeof useSideColumn>
} | null = null

function Probe() {
  seen = { strip: useSideRailStrip(), column: useSideColumn() }
  return null
}

function SessionScreen() {
  useSideColumnFullScreen(true)
  return null
}

function render(geometry: Geometry, session = true) {
  state.geometry = geometry
  act(() => {
    const app = (
      <SideRailProvider>
        {session ? <SessionScreen /> : null}
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

afterEach(async () => {
  act(() => tree?.unmount())
  tree = undefined
  seen = null
  await foldedFullScreen.setDefault(false)
})

describe('full screen when folded', () => {
  it('keeps the column for the keys while it is off', () => {
    render(DUO_FOLDED)
    expect(seen?.strip?.side).toBe('right')
    expect(seen?.column).toMatchObject({ extended: false, folded: true })
  })

  it('gives a session screen the column, and screens see no rail to draw in', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED)
    expect(seen?.strip).toBeNull()
    expect(seen?.column).toMatchObject({ side: 'right', width: 84, extended: true })
  })

  it('brings the column back when switched off from the session screen', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED)
    act(() => foldedFullScreen.toggle())
    expect(seen?.strip?.side).toBe('right')
    expect(seen?.column?.extended).toBe(false)
  })

  it('stays extended while iOS stops reporting the column with the status bar hidden', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED)
    render({
      ...DUO_FOLDED,
      insets: { ...DUO_FOLDED.insets, right: 0 },
      regions: { divisions: [], occlusions: [], hasFoldDivision: true }
    })
    expect(seen?.column).toMatchObject({ side: 'right', extended: true })
  })

  it('only applies on a screen that asks for it', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED, false)
    expect(seen?.strip?.side).toBe('right')
    expect(seen?.column?.extended).toBe(false)
  })

  it('leaves the unfolded Duo alone', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_UNFOLDED)
    expect(seen?.column).toMatchObject({ extended: false, folded: false })
  })

  it('leaves a phone without a status column alone', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(IPHONE_PORTRAIT)
    expect(seen?.strip).toBeNull()
    expect(seen?.column).toBeNull()
  })
})
