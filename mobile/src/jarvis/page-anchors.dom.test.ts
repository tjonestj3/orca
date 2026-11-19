// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { pageAnchorsScript, readPageAnchorMessage } from './page-anchors'

function place(el: HTMLElement, r: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...r,
    x: r.left,
    y: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
    toJSON: () => r
  })
}

function listen() {
  const posted: ReturnType<typeof readPageAnchorMessage>[] = []
  Object.defineProperty(window, 'orcaBridge', {
    configurable: true,
    value: { postMessage: (json: string) => posted.push(readPageAnchorMessage(json)) }
  })
  return posted
}

it('makes room on the right of the header’s bar, says where its menu is, and puts it back', () => {
  const posted = listen()
  document.body.innerHTML =
    '<div id="bar" style="padding-right: 8px"><div><div id="more" aria-label="More actions"></div></div></div>' +
    '<div><div id="queued" aria-label="More actions"></div></div>'
  const bar = document.getElementById('bar')!
  place(bar, { left: 0, top: 0, width: window.innerWidth, height: 44 })
  place(document.getElementById('more')!, { left: 300, top: 0, width: 44, height: 44 })
  // The same label lower down (a queued message's menu) isn't the header's.
  place(document.getElementById('queued')!, { left: 300, top: 600, width: 44, height: 44 })

  const header = (pad: number) => [
    { name: 'header' as const, labels: ['More actions'], near: 'top' as const, pad }
  ]
  new Function(pageAnchorsScript(header(128)))()
  expect(bar.style.getPropertyValue('padding-right')).toBe('136px')
  expect(posted).toEqual([{ name: 'header', at: { x: 300, y: 0, width: 44, height: 44 } }])

  new Function(pageAnchorsScript(header(0)))() // the column back
  expect(bar.style.getPropertyValue('padding-right')).toBe('')
})

it('finds the composer’s mic in the page’s bottom half, whichever state its label says, and its going', () => {
  const posted = listen()
  const height = window.innerHeight
  document.body.innerHTML = '<div id="mic" aria-label="Stop and insert"></div>'
  place(document.getElementById('mic')!, { left: 358, top: height - 60, width: 36, height: 36 })
  const mic = [
    {
      name: 'mic' as const,
      labels: ['Dictate', 'Stop and insert'],
      near: 'bottom' as const,
      pad: 0
    }
  ]
  new Function(pageAnchorsScript(mic))()
  expect(posted.at(-1)).toEqual({
    name: 'mic',
    at: { x: 358, y: height - 60, width: 36, height: 36 }
  })

  document.body.innerHTML = '<p>A markdown file, no composer</p>'
  new Function(pageAnchorsScript(mic))()
  expect(posted.at(-1)).toEqual({ name: 'mic', at: null })
})
