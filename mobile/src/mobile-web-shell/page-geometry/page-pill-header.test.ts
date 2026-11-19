import { expect, it } from 'vitest'
import { pillPlace } from './page-pill-header'

it('sits under the page’s own top inset, not the camera’s band, and clear of the column it extends over', () => {
  const fold = { safeAreaInsets: { top: 67 }, raisedBy: 67 }
  expect(pillPlace(fold, { side: 'right', width: 84, extended: true })).toEqual({
    top: 8,
    left: 8,
    right: 92
  })
  expect(pillPlace({ safeAreaInsets: { top: 20 }, raisedBy: 0 }, null)).toEqual({
    top: 28,
    left: 8,
    right: 8
  })
  expect(pillPlace(fold, { side: 'right', width: 84, extended: false })).toEqual({
    top: 8,
    left: 8,
    right: 8
  })
})
