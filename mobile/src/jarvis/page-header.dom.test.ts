// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { pageHeaderScript, readPageHeaderMessage } from './page-header'

const settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

function rect(el: HTMLElement, r: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...r,
    x: r.left,
    y: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
    toJSON: () => r
  })
}

it('makes room on the right of the header’s bar, says where its button is, and puts it back', async () => {
  const posted: unknown[] = []
  Object.defineProperty(window, 'orcaBridge', {
    configurable: true,
    value: { postMessage: (json: string) => posted.push(readPageHeaderMessage(json)) }
  })
  document.body.innerHTML =
    '<div id="bar" style="padding-right: 8px"><div><div id="more" aria-label="More actions"></div></div></div>' +
    '<div id="row"><div id="queued" aria-label="More actions"></div></div>'
  const bar = document.getElementById('bar')!
  rect(bar, { left: 0, top: 0, width: window.innerWidth, height: 44 })
  rect(document.getElementById('more')!, { left: 300, top: 0, width: 44, height: 44 })
  // The same label lower down (a queued message's menu) isn't the header's.
  rect(document.getElementById('queued')!, { left: 300, top: 600, width: 44, height: 44 })

  new Function(pageHeaderScript('More actions', 128))()
  expect(bar.style.getPropertyValue('padding-right')).toBe('136px')
  expect(posted).toEqual([{ x: 300, y: 0, width: 44, height: 44 }])

  new Function(pageHeaderScript('More actions', 0))() // the column back
  expect(bar.style.getPropertyValue('padding-right')).toBe('')

  new Function(pageHeaderScript(null, 0))() // a session: no header to clear
  expect(posted.at(-1)).toBeNull()

  await settle()
})
