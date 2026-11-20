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
    '<div id="bar" style="display: flex; flex-direction: row; padding-right: 8px"><div><div id="more" aria-label="More actions"></div></div></div>' +
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
  expect(bar.style.getPropertyValue('padding-right')).toBe('8px') // as the page had it
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

it('finds an agent’s question by its options, whatever they say', () => {
  const posted = listen()
  const height = window.innerHeight
  document.body.innerHTML = '<div id="option" role="radio">Phased specs</div>'
  place(document.getElementById('option')!, {
    left: 20,
    top: height - 300,
    width: 360,
    height: 120
  })
  const question = [
    {
      name: 'question' as const,
      labels: [],
      selector: '[role="radio"],[role="checkbox"]',
      near: 'bottom' as const,
      pad: 0
    }
  ]
  new Function(pageAnchorsScript(question))()
  expect(posted.at(-1)).toEqual({
    name: 'question',
    at: { x: 20, y: height - 300, width: 360, height: 120 }
  })
})

it('in a split view makes room in the mic’s own row, not the whole page around it', () => {
  listen()
  const width = window.innerWidth
  const height = window.innerHeight
  document.body.innerHTML =
    '<div id="page" style="display: flex; flex-direction: row">' +
    '<div id="hosts"></div>' +
    '<div id="session"><div id="input" style="display: flex; flex-direction: row">' +
    '<div id="field"></div><div><div id="mic" aria-label="Dictate"></div></div>' +
    '</div></div></div>'
  place(document.getElementById('page')!, { left: 0, top: 0, width, height })
  place(document.getElementById('input')!, {
    left: width * 0.3,
    top: height - 80,
    width: width * 0.7,
    height: 60
  })
  place(document.getElementById('mic')!, {
    left: width - 60,
    top: height - 70,
    width: 40,
    height: 40
  })
  const mic = [{ name: 'mic' as const, labels: ['Dictate'], near: 'bottom' as const, pad: 48 }]
  new Function(pageAnchorsScript(mic))()
  expect(document.getElementById('input')!.style.getPropertyValue('padding-right')).toBe('48px')
  expect(document.getElementById('page')!.style.getPropertyValue('padding-right')).toBe('')
})

it('gives the host list’s header back the camera’s room when it shows beside a session, and puts it back', () => {
  listen()
  document.body.innerHTML =
    '<div id="safe" style="padding-top: 67px"><div id="bar"><div id="more" aria-label="More actions"></div></div></div>'
  place(document.getElementById('more')!, { left: 250, top: 75, width: 44, height: 44 })
  const header = (lift: number) => [
    { name: 'header' as const, labels: ['More actions'], near: 'top' as const, pad: 0, lift }
  ]
  new Function(pageAnchorsScript(header(67)))()
  expect(document.getElementById('safe')!.style.getPropertyValue('padding-top')).toBe('0px')
  new Function(pageAnchorsScript(header(0)))() // folded again: the session alone
  expect(document.getElementById('safe')!.style.getPropertyValue('padding-top')).toBe('67px')
})

it('leaves the page alone while a sheet is open, and catches up when it closes', () => {
  const posted = listen()
  const height = window.innerHeight
  document.body.innerHTML =
    '<div id="mic" aria-label="Dictate"></div><div id="sheet" aria-modal="true"></div>'
  place(document.getElementById('mic')!, { left: 300, top: height - 60, width: 36, height: 36 })
  const mic = [{ name: 'mic' as const, labels: ['Dictate'], near: 'bottom' as const, pad: 0 }]
  new Function(pageAnchorsScript(mic))()
  expect(posted).toEqual([])
  document.getElementById('sheet')!.remove()
  new Function(pageAnchorsScript(mic))()
  expect(posted.at(-1)).toEqual({
    name: 'mic',
    at: { x: 300, y: height - 60, width: 36, height: 36 }
  })
})

it('keeps the host list’s header lifted however often the page changes', async () => {
  listen()
  document.body.innerHTML =
    '<div id="safe" style="padding-top: 67px"><div><div id="more" aria-label="More actions"></div></div></div>'
  place(document.getElementById('more')!, { left: 250, top: 75, width: 44, height: 44 })
  const header = [
    { name: 'header' as const, labels: ['More actions'], near: 'top' as const, pad: 0, lift: 67 }
  ]
  new Function(pageAnchorsScript(header))()
  for (let i = 0; i < 4; i++) {
    // Each change on the page runs the check again.
    document.body.appendChild(document.createElement('span'))
    // The check runs a quarter second after a change (at most four a second), then on the next frame.
    await new Promise((resolve) => setTimeout(resolve, 300))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(
      document.getElementById('safe')!.style.getPropertyValue('padding-top'),
      `change ${i}`
    ).toBe('0px')
  }
})

it('says where a moving button is every frame until it holds still, not four times a second', async () => {
  const posted = listen()
  const height = window.innerHeight
  document.body.innerHTML = '<div id="mic" aria-label="Dictate"></div>'
  const mic = document.getElementById('mic')!
  place(mic, { left: 358, top: height - 60, width: 36, height: 36 })
  new Function(pageAnchorsScript([{ name: 'mic', labels: ['Dictate'], near: 'bottom', pad: 0 }]))()
  const frame = () => new Promise((done) => requestAnimationFrame(() => done(null)))
  // The composer slides up as the keyboard comes, with nothing changing in the page for its watch to see.
  for (const top of [height - 100, height - 140, height - 180]) {
    place(mic, { left: 358, top, width: 36, height: 36 })
    await frame()
    await frame()
    expect(posted.at(-1)).toEqual({ name: 'mic', at: { x: 358, y: top, width: 36, height: 36 } })
  }
  const told = posted.length
  for (let i = 0; i < 12; i++) {
    await frame()
  }
  expect(posted.length).toBe(told) // held still: nothing more to say
})
