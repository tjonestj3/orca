// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { pagePillHeaderScript, type PagePill } from './page-pill-header'

function place(el: Element, r: { top: number; height: number; width?: number }) {
  const width = r.width ?? 400
  el.getBoundingClientRect = () => ({
    x: 0,
    y: r.top,
    left: 0,
    top: r.top,
    width,
    height: r.height,
    right: width,
    bottom: r.top + r.height,
    toJSON: () => r
  })
}

const PILL: PagePill = {
  moreLabel: 'More session actions',
  newTabLabel: 'New tab',
  top: 20,
  left: 0,
  right: 84,
  background: '#1a1b26',
  chip: 'Xeno Laptop'
}

// Orca's session header: the nav bar (back, the title button with the worktree and the dot-and-branch line, the
// branch and ⋯ buttons) over the tab strip (the agent's tab, the tab count, +), above the chat.
const ORCA_HEADER =
  '<div id="pane"><div id="top" style="border-bottom: 1px solid #333"><div id="chrome" style="padding-top: 67px">' +
  '<div id="nav"><div id="bar" style="display: flex; flex-direction: row">' +
  '<div id="leading" style="flex: 1 1 0px"><div id="back" aria-label="Back to worktrees"><svg></svg></div></div>' +
  '<div id="center" style="align-items: center"><div id="block" role="button">' +
  '<div id="name">barge-in-no-wake-word</div><div id="meta"><div id="dot" style="background-color: rgb(166, 227, 161)"></div><div>tjonestj3/barge-in-no-wake-word</div></div>' +
  '</div></div>' +
  '<div id="trailing"><div id="branch" aria-label="Source control"></div><div id="more" aria-label="More session actions"></div></div>' +
  '</div></div>' +
  '<div id="strip"><div id="tabbar" style="display: flex; flex-direction: row; border-top: 1px solid #333">' +
  '<div id="tabcell">CARD-009362 phase 2a</div><div id="count" aria-label="2 tabs"><div>2</div><div id="alert" style="position: absolute; background-color: red"></div></div><div id="newcell"><div id="new" aria-label="New tab"></div></div>' +
  '</div></div>' +
  '</div></div>' +
  '<div id="chatview" data-testid="native-chat-view">' +
  '<div id="chat" style="overflow-y: auto"><div id="content"><p>hello</p></div></div>' +
  '<div data-testid="native-chat-lower-scroll" id="lower" style="overflow-y: auto"><div id="card"></div></div>' +
  '</div></div>'

const byId = (id: string) => document.getElementById(id)!
const style = (id: string, prop: string) => byId(id).style.getPropertyValue(prop)
const role = (id: string) => byId(id).getAttribute('data-xeno-pill')
const circle = (id: string) => byId(id).getAttribute('data-xeno-btn')
const run = (pill: PagePill | null) => new Function(pagePillHeaderScript(pill))()

function orcaHeader() {
  document.body.innerHTML = ORCA_HEADER
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 0, height: 44 })
  place(byId('bar'), { top: 0, height: 44 })
  place(byId('tabbar'), { top: 52, height: 40 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })
  place(byId('lower'), { top: 0, height: window.innerHeight })
}

it('lays the header across the very top of the pane, the chat starting below it, and puts it all back', () => {
  orcaHeader()
  run(PILL)
  expect(style('chrome', 'position')).toBe('absolute')
  expect(style('chrome', 'top')).toBe('0px')
  expect(style('chrome', 'right')).toBe('84px')
  expect(style('chrome', 'padding-top')).toBe('26px') // its row under the top inset
  expect(role('chrome')).toBe('bar')
  expect(style('content', 'padding-top')).toBe(`${44 + 6}px`)
  expect(style('card', 'padding-top')).toBe('') // a tall question's region isn't the transcript
  expect(style('top', 'z-index')).toBe('20')
  expect(style('top', 'border-bottom-width')).toBe('0px')
  expect(document.getElementById('xeno-pill-style')).not.toBeNull()

  run(null) // Standard header, or a terminal
  expect(style('chrome', 'position')).toBe('')
  expect(style('chrome', 'padding-top')).toBe('67px') // as the page had it
  expect(style('content', 'padding-top')).toBe('')
  expect(document.querySelectorAll('[data-xeno-pill], [data-xeno-btn]')).toHaveLength(0)
  expect(document.getElementById('xeno-pill-style')).toBeNull()
})

it('is Moshi’s row: back, tabs, the name and branch, the desktop chip, branch, menu', () => {
  orcaHeader()
  run(PILL)
  for (const id of ['nav', 'bar', 'strip', 'tabbar']) {
    expect(role(id)).toBe('flat')
  }
  expect([role('leading'), role('count'), role('center'), role('trailing')]).toEqual([
    'lead',
    'count',
    'title',
    'trail'
  ])
  expect([circle('back'), circle('count'), circle('branch'), circle('more')]).toEqual([
    'yellow',
    'green',
    'salmon',
    'blue'
  ])
  expect([role('block'), role('name'), role('meta'), role('dot')]).toEqual([
    'tblock',
    'ttext',
    'tmeta',
    'state'
  ])
  expect(byId('chrome').getAttribute('data-xeno-conn')).toBe('ok') // the dot's green
  expect(role('alert')).toBe('alert') // another tab needs you
  expect(role('tabcell')).toBe('hide')
  expect(role('newcell')).toBe('hide')
  expect(document.getElementById('xeno-pill-style')!.textContent).toContain(
    'content: "Xeno Laptop"'
  )
})

it('stays as you type, though the buttons it is found by have no box once hidden and laid out', () => {
  orcaHeader()
  run(PILL)
  place(byId('new'), { top: 0, height: 0, width: 0 })
  place(byId('bar'), { top: 0, height: 0, width: 0 })
  place(byId('tabbar'), { top: 0, height: 0, width: 0 })
  byId('content').append(' typing')
  run(PILL)
  expect(style('chrome', 'position')).toBe('absolute')
  expect(role('center')).toBe('title')
  expect(role('newcell')).toBe('hide')
})

it('leaves a page without a session header alone', () => {
  document.body.innerHTML = '<div id="x" style="padding-top: 4px"><p>No header</p></div>'
  run(PILL)
  expect(byId('x').style.getPropertyValue('padding-top')).toBe('4px')
  expect(document.getElementById('xeno-pill-style')).toBeNull()
})

it('when it comes off, gives the header back as the page last set it, not as it was when the bar went on', () => {
  orcaHeader()
  run(PILL)
  // Measured, the page sets its header beside the camera, under the bar (React writes plain inline styles).
  const chrome = byId('chrome').style
  chrome.paddingTop = '0px'
  chrome.paddingRight = '84px'
  run(PILL)
  expect(chrome.getPropertyValue('padding-top')).toBe('26px') // still the bar's
  run(null) // switched to the terminal
  expect(chrome.getPropertyValue('padding-top')).toBe('0px')
  expect(chrome.getPropertyValue('padding-right')).toBe('84px')
})

it('when the page restyles its header just before the bar comes off, the page’s style stands', () => {
  orcaHeader()
  run(PILL)
  // Switching to the terminal, Orca re-measures its header in the same moment the bar is told to come off.
  byId('chrome').style.paddingTop = '12px'
  run(null)
  expect(style('chrome', 'padding-top')).toBe('12px')
})

it('over a terminal keeps the bar in the page’s flow, and moves between the two as the view switches', () => {
  orcaHeader()
  run(PILL)
  expect(style('chrome', 'position')).toBe('absolute')
  byId('chatview').remove() // switched to the terminal
  document.getElementById('pane')!.insertAdjacentHTML('beforeend', '<div class="xterm"></div>')
  run(PILL)
  expect(style('chrome', 'position')).toBe('')
  expect(style('chrome', 'padding-top')).toBe('67px') // the page's own, in flow
  expect(role('chrome')).toBe('bar')
  expect(role('center')).toBe('title')
  run(null)
  expect(role('chrome')).toBeNull()
})

it('colours the chip by the desktop’s connection, from Orca’s status dot', () => {
  orcaHeader()
  byId('dot').style.backgroundColor = 'rgb(243, 139, 168)'
  run(PILL)
  expect(byId('chrome').getAttribute('data-xeno-conn')).toBe('down')
  byId('dot').style.backgroundColor = 'rgb(249, 226, 175)'
  byId('content').append(' more')
  run(PILL)
  expect(byId('chrome').getAttribute('data-xeno-conn')).toBe('wait')
  run(null)
  expect(byId('chrome').getAttribute('data-xeno-conn')).toBeNull()
})

it('puts no chip on the bar without a desktop name', () => {
  orcaHeader()
  run({ ...PILL, chip: null })
  expect(document.getElementById('xeno-pill-style')!.textContent).not.toContain('title"]::after')
  run(null)
})
