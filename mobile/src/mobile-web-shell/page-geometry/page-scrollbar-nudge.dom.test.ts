// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { PAGE_SCROLLBAR_NUDGE } from './page-scrollbar-nudge'

const frame = () => new Promise((done) => requestAnimationFrame(() => done(null)))

function scroller(id: string, top: number) {
  const el = document.getElementById(id)!
  el.style.overflowY = 'auto'
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 2000 })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 600 })
  const seen: number[] = []
  let at = top
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => at,
    set: (v: number) => {
      at = Math.max(0, v)
      seen.push(at)
    }
  })
  return seen
}

it('moves each scroller a pixel and back when the page’s width changes, so iOS redraws its bar at the new edge', async () => {
  delete (window as { __xenoScrollbarNudge?: unknown }).__xenoScrollbarNudge
  document.body.innerHTML =
    '<div id="list"></div><div id="top"></div><div id="chat"></div><p>not a scroller</p>'
  const list = scroller('list', 300)
  const atTop = scroller('top', 0)
  const chat = scroller('chat', 1400) // at its end, following its newest line
  new Function(PAGE_SCROLLBAR_NUDGE)()

  window.dispatchEvent(new Event('resize')) // the height alone (the keyboard): left be
  await frame()
  await frame()
  expect([list, atTop, chat]).toEqual([[], [], []])

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: window.innerWidth + 84 })
  new Function(PAGE_SCROLLBAR_NUDGE)() // the app runs it again as the column goes, before the resize is seen
  window.dispatchEvent(new Event('resize'))
  await frame()
  await frame()
  expect(list).toEqual([299, 300]) // up a pixel, back where it was
  expect(atTop).toEqual([1, 0]) // at the top, down a pixel and back
  expect(chat).toEqual([1399, 2000]) // back to its end, so it keeps following
})
