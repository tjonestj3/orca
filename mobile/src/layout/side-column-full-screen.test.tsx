import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReservedRegions } from '../../modules/orca-reserved-regions/src'

type Geometry = {
  window: { width: number; height: number }
  insets: { top: number; right: number; bottom: number; left: number }
  regions: ReservedRegions
}

const state = vi.hoisted(() => ({ geometry: null as unknown as Geometry }))
const layoutAnimation = vi.hoisted(() => ({ configureNext: vi.fn() }))

vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: <T,>(styles: T) => styles },
  LayoutAnimation: layoutAnimation,
  Animated: {
    View: 'AnimatedView',
    Value: class {
      constructor(public value: number) {}
    },
    timing: () => ({ start: () => undefined })
  },
  useWindowDimensions: () => state.geometry.window
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => state.geometry.insets
}))
vi.mock('./reserved-regions', () => ({ useReservedRegions: () => state.geometry.regions }))
vi.mock('../platform/keyboard/keyboard-occlusion', () => ({ useKeyboardOcclusion: () => 0 }))
vi.mock('./column-toggle', () => ({ ColumnToggle: 'ColumnToggle' }))
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
const DUO_WIDE: Geometry = {
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

/** A session: the desktop's page, whose header the app doesn't draw, so the column holds its toggle. */
function SessionPage() {
  useSideColumnFullScreen(true, { columnToggle: true })
  return null
}

/** A page the shell shows: resized at once, not eased. */
function WebPage() {
  useSideColumnFullScreen(true, { columnToggle: true, snap: true })
  return null
}

/** A screen letting go of full screen does so a moment later, so the next can ask first. */
const letGo = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

function render(geometry: Geometry, session: boolean | 'page' | 'web' = true) {
  state.geometry = geometry
  act(() => {
    const app = (
      <SideRailProvider>
        {session === 'web' ? (
          <WebPage />
        ) : session === 'page' ? (
          <SessionPage />
        ) : session ? (
          <SessionScreen />
        ) : null}
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

const toggles = () =>
  tree!.root.findAll((node) => (node.type as unknown) === 'ColumnToggle').map((node) => node.props)

afterEach(async () => {
  act(() => tree?.unmount())
  tree = undefined
  seen = null
  await foldedFullScreen.setDefault(false)
  layoutAnimation.configureNext.mockClear()
})

describe('full screen when folded', () => {
  it('keeps the column for the keys while it is off', () => {
    render(DUO_FOLDED)
    expect(seen?.strip?.side).toBe('right')
    expect(seen?.column?.extended).toBe(false)
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

  it('works on any screen with a status column, whatever size the phone reports', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_WIDE)
    expect(seen?.strip).toBeNull()
    expect(seen?.column).toMatchObject({ side: 'right', extended: true })
  })

  it("draws a session page's toggle in the column, under the camera, while extended", async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED, 'page')
    expect(toggles()).toEqual([{ slot: { side: 'right', width: 84, top: 69 }, extended: true }])
  })

  it('heads the rail with it while the column is back, and the rail starts below it', () => {
    render(DUO_FOLDED, 'page')
    expect(toggles()).toEqual([{ slot: { side: 'right', width: 84, top: 174 }, extended: false }])
    expect(seen?.strip).toMatchObject({ top: 174 + 44, height: 470 - 44 })
  })

  it('leaves the toggle to a screen with its own header', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED)
    expect(toggles()).toEqual([])
  })

  it('eases the screen out over the column and back, rather than jumping', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED, 'page')
    expect(layoutAnimation.configureNext).toHaveBeenCalledTimes(1)
    render(DUO_FOLDED, false) // back to the worktree list: the rail returns
    await letGo()
    expect(seen?.column?.extended).toBe(false)
    expect(layoutAnimation.configureNext).toHaveBeenCalledTimes(2)
  })

  it('resizes a web page at once, since easing it makes the page lay itself out every frame', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED, 'web')
    expect(seen?.column?.extended).toBe(true)
    act(() => foldedFullScreen.toggle()) // the session's toggle: the column back
    expect(seen?.column?.extended).toBe(false)
    expect(layoutAnimation.configureNext).not.toHaveBeenCalled()
  })

  it('keeps full screen through going from one full-screen screen to another', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(DUO_FOLDED, 'web')
    render(DUO_FOLDED, true) // a session back to Home: Home asks before the page lets go
    expect(seen?.column?.extended).toBe(true)
    await letGo()
    expect(seen?.column?.extended).toBe(true)
    expect(layoutAnimation.configureNext).not.toHaveBeenCalled()
  })

  it('animates nothing while the column stays as it is', () => {
    render(DUO_FOLDED, false)
    render(DUO_FOLDED, 'page') // full screen is off: the session keeps the column
    expect(layoutAnimation.configureNext).not.toHaveBeenCalled()
  })

  it('leaves a phone without a status column alone', async () => {
    await act(() => foldedFullScreen.setDefault(true))
    render(IPHONE_PORTRAIT)
    expect(seen?.strip).toBeNull()
    expect(seen?.column).toBeNull()
  })
})
