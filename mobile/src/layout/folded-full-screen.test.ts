import { describe, expect, it } from 'vitest'
import {
  COLUMN_HEADER_BAND,
  COLUMN_TOGGLE_BUTTON,
  COLUMN_TOGGLE_SLOT,
  COLUMN_TOGGLE_TOP,
  columnClearance,
  columnToggleSlot,
  createFoldedFullScreenStore,
  extendedColumnSide,
  pageOverColumn
} from './folded-full-screen'
import { topChromeSpace } from './top-chrome-space'

function memoryStorage(initial: string | null = null) {
  const saved = { value: initial }
  return {
    saved,
    getItem: async () => saved.value,
    setItem: async (_key: string, value: string) => {
      saved.value = value
    }
  }
}

describe('the folded full-screen choice', () => {
  it('is off until set', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    await store.load()
    expect(store.read()).toBe(false)
    expect(store.readDefault()).toBe(false)
  })

  it('remembers the default from Settings across launches', async () => {
    const storage = memoryStorage()
    await createFoldedFullScreenStore(storage).setDefault(true)
    const relaunched = createFoldedFullScreenStore(storage)
    await relaunched.load()
    expect(relaunched.read()).toBe(true)
  })

  it('flips from the session screen without changing the default', async () => {
    const storage = memoryStorage('true')
    const store = createFoldedFullScreenStore(storage)
    await store.load()
    store.toggle()
    expect(store.read()).toBe(false)
    expect(store.readDefault()).toBe(true)
    expect(storage.saved.value).toBe('true')
    store.toggle()
    expect(store.read()).toBe(true)
  })

  it('goes back to the default when Settings changes it', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    await store.load()
    store.toggle()
    expect(store.read()).toBe(true)
    await store.setDefault(false)
    expect(store.read()).toBe(false)
  })

  it('tells listeners when it changes', async () => {
    const store = createFoldedFullScreenStore(memoryStorage())
    let calls = 0
    store.subscribe(() => calls++)
    store.toggle()
    await store.setDefault(true)
    expect(calls).toBe(2)
  })
})

describe('which side the screens extend over', () => {
  const column = { side: 'right' as const }
  const on = { requested: true, fullScreen: true, column }

  it('is the column side while a session screen asks and full screen is on', () => {
    expect(extendedColumnSide(on)).toBe('right')
  })

  it('is none when any of those is missing', () => {
    expect(extendedColumnSide({ ...on, requested: false })).toBeNull()
    expect(extendedColumnSide({ ...on, fullScreen: false })).toBeNull()
    expect(extendedColumnSide({ ...on, column: null })).toBeNull()
  })
})

describe('the room a header leaves for the camera', () => {
  it('is the column width on its side, only while screens extend over it', () => {
    expect(columnClearance({ side: 'right', width: 84, extended: true })).toEqual({
      paddingRight: 84
    })
    expect(columnClearance({ side: 'left', width: 84, extended: true })).toEqual({
      paddingLeft: 84
    })
    expect(columnClearance({ side: 'right', width: 84, extended: false })).toBeNull()
    expect(columnClearance(null)).toBeNull()
  })
})

// The iPhone Duo cover screen: its camera reaches 66 pt down the status column.
const RIGHT_COLUMN = { side: 'right' as const, width: 84, extended: true }
const RAIL = { side: 'right' as const, width: 84, top: 174, bottom: 34, height: 470 }

describe("the column's own toggle, for a screen whose header is not the app's", () => {
  it('sits under the camera while the screen extends over the column', () => {
    expect(columnToggleSlot({ wanted: true, column: RIGHT_COLUMN, strip: null })).toEqual({
      side: 'right',
      width: 84,
      top: COLUMN_TOGGLE_TOP
    })
    expect(COLUMN_TOGGLE_TOP).toBeGreaterThan(66)
  })

  it('heads the rail while the column is back', () => {
    expect(
      columnToggleSlot({ wanted: true, column: { ...RIGHT_COLUMN, extended: false }, strip: RAIL })
    ).toEqual({ side: 'right', width: 84, top: 174 })
  })

  it('is left out where nothing asks for it, or the rail has no room for it', () => {
    expect(columnToggleSlot({ wanted: false, column: RIGHT_COLUMN, strip: null })).toBeNull()
    expect(columnToggleSlot({ wanted: true, column: null, strip: null })).toBeNull()
    expect(
      columnToggleSlot({
        wanted: true,
        column: { ...RIGHT_COLUMN, extended: false },
        strip: { ...RAIL, height: COLUMN_TOGGLE_SLOT }
      })
    ).toBeNull()
  })
})

describe('what a session page extending over the column is told', () => {
  const told = pageOverColumn({
    insets: { top: 0, right: 84, bottom: 34, left: 0 },
    occlusions: [],
    column: RIGHT_COLUMN,
    windowWidth: 466
  })

  it('has no inset on the column side, so it lays out full width with its keys at the bottom', () => {
    expect(told.insets).toMatchObject({ right: 0, bottom: 34, left: 0 })
  })

  it("keeps its header clear of the column's top, the camera and the toggle under it", () => {
    expect(told.occlusions).toContainEqual({ x: 382, y: 0, width: 84, height: COLUMN_HEADER_BAND })
    expect(COLUMN_HEADER_BAND).toBeGreaterThan(66) // the camera's bottom
    // The page's header (the desktop's own code) pads itself out of a cutout at the top like this.
    const header = { x: 0, y: 0, width: 466, height: 96 }
    expect(topChromeSpace(header, told.insets.top, told.occlusions)).toEqual({
      left: 0,
      right: 84,
      minHeight: COLUMN_HEADER_BAND
    })
  })

  it('gets no shorter a screen than beside the column: its header stays its own height', () => {
    // Beside the column the session header (title row and tabs) is 96 pt; held taller over it, it took that
    // room from the page and jumped on the way out.
    expect(COLUMN_HEADER_BAND).toBeLessThan(96)
    // The button fits beside the header, under the camera, inside the header's own height.
    expect(COLUMN_TOGGLE_TOP).toBeGreaterThanOrEqual(COLUMN_HEADER_BAND)
    expect(COLUMN_TOGGLE_TOP + COLUMN_TOGGLE_BUTTON).toBeLessThanOrEqual(96)
  })

  it('leaves the top alone for a page whose header only keeps below it (the host list)', () => {
    const page = pageOverColumn({
      insets: { top: 0, right: 84, bottom: 34, left: 0 },
      occlusions: [],
      column: RIGHT_COLUMN,
      windowWidth: 466,
      raiseTop: false
    })
    expect(page.insets).toEqual({ top: 0, right: 0, bottom: 34, left: 0 })
  })

  it('is told nothing new while the column is not extended', () => {
    const insets = { top: 0, right: 84, bottom: 34, left: 0 }
    expect(
      pageOverColumn({
        insets,
        occlusions: [],
        column: { ...RIGHT_COLUMN, extended: false },
        windowWidth: 466
      })
    ).toEqual({ insets, occlusions: [] })
  })
})
