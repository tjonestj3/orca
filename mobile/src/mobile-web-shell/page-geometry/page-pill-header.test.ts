import { expect, it } from 'vitest'
import { pillPlace } from './page-pill-header'

it('spans the pane’s top, its row under the page’s own top inset (not the camera’s band), clear of the column', () => {
  const fold = { safeAreaInsets: { top: 67 }, raisedBy: 67 }
  expect(pillPlace(fold, { side: 'right', width: 84, extended: true })).toEqual({
    top: 0,
    left: 0,
    right: 84
  })
  expect(pillPlace({ safeAreaInsets: { top: 20 }, raisedBy: 0 }, null)).toEqual({
    top: 20,
    left: 0,
    right: 0
  })
  expect(pillPlace(fold, { side: 'right', width: 84, extended: false })).toEqual({
    top: 0,
    left: 0,
    right: 0
  })
})

it('on the session sheet, puts its row just under the grab handle, the sheet having cleared some of the inset', () => {
  expect(pillPlace({ safeAreaInsets: { top: 0 }, raisedBy: 0 }, null, true).top).toBe(8)
  expect(pillPlace({ safeAreaInsets: { top: 59 }, raisedBy: 0 }, null, true).top).toBe(57)
})
