import { expect, it } from 'vitest'
import { noteLayout, rect, subscribeLayoutNotes } from './layout-notes'

it('notes a layout change once, and hands a call the notes from before it started', () => {
  noteLayout('rail', { window: '458x1000', column: 'right 84' })
  noteLayout('rail', { window: '458x1000', column: 'right 84' }) // unchanged: not noted again
  const heard: string[] = []
  const stop = subscribeLayoutNotes((note) => heard.push(`${note.kind} ${String(note.window)}`))
  expect(heard).toEqual(['layout-rail 458x1000']) // the one from before the call
  noteLayout('rail', { window: '700x1000', column: 'none' }) // unfolded
  expect(heard).toEqual(['layout-rail 458x1000', 'layout-rail 700x1000'])
  stop()
  expect(rect({ x: 0, y: 10.4, width: 320.6, height: 900 })).toBe('0,10 321x900')
})
