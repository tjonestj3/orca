// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { pagePillHeaderScript, type PagePill } from './page-pill-header'
import { isHoldHapticMessage } from './page-pill-tap'

function place(el: Element, r: { top: number; height: number; width?: number; left?: number }) {
  const width = r.width ?? 400
  const left = r.left ?? 0
  el.getBoundingClientRect = () => ({
    x: left,
    y: r.top,
    left,
    top: r.top,
    width,
    height: r.height,
    right: left + width,
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
  expect(byId('chrome').getAttribute('data-xeno-mode')).toBe('float') // the fade behind it, over the chat
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

it('is Moshi’s row: back, tabs, the agent’s tab, the desktop chip, branch, menu', () => {
  orcaHeader()
  run(PILL)
  // The title row keeps its box (Orca places the workspace card below it); the tab strip's row lies over it.
  expect([role('nav'), role('bar'), role('strip'), role('tabbar')]).toEqual([
    'line',
    'line',
    'flat',
    'tabrow'
  ])
  expect(style('tabbar', 'left')).toBe('44px') // just after back
  expect([role('leading'), role('center'), role('trailing')]).toEqual(['lead', 'ghost', 'trail'])
  expect([role('count'), role('tabcell'), role('newcell')]).toEqual(['count', 'tabcap', 'hide'])
  expect([circle('back'), circle('count'), circle('branch'), circle('more')]).toEqual([
    'yellow',
    'green',
    'salmon',
    'blue'
  ])
  expect(role('dot')).toBe('state')
  expect(byId('chrome').getAttribute('data-xeno-conn')).toBe('ok') // the dot's green
  expect(role('alert')).toBe('alert') // another tab needs you
  expect(document.getElementById('xeno-pill-style')!.textContent).toContain(
    'content: "Xeno Laptop"'
  )
})

it('pins back and the branch and menu circles to the bar’s ends, the tab row between, whatever Orca’s row does', () => {
  orcaHeader()
  run(PILL)
  // Placed once the bar is at the top: its row's height there, not where the header sat before.
  expect([style('leading', 'top'), style('trailing', 'top'), style('tabbar', 'top')]).toEqual([
    '26px',
    '26px',
    '26px'
  ])
  expect(style('tabbar', 'left')).toBe(`${14 + 22 + 8}px`) // back
  expect(style('tabbar', 'right')).toBe(`${14 + 22 + 8 + 22 + 8}px`) // branch and menu
  const css = document.getElementById('xeno-pill-style')!.textContent!
  expect(css).toMatch(/\[data-xeno-pill="lead"\] \{ position: absolute !important; left: 14px/)
  expect(css).toMatch(/\[data-xeno-pill="trail"\] \{ position: absolute !important; right: 14px/)
  expect(css).toMatch(/\[data-xeno-pill="line"\] \{ position: static !important/)
  // Each circle answers a fingertip 44 pt tall, not just its 22 pt.
  expect(css).toMatch(
    /\[data-xeno-btn\]::before \{ content: ""; position: absolute; top: -11px; bottom: -11px/
  )
  // The fade behind it runs out over the column the bar keeps clear of.
  expect(style('chrome', '--xeno-fade-right')).toBe('-84px')
  run(null)
  expect(style('leading', 'top')).toBe('')
})

it('lets a question’s card take the room under the bar, not Orca’s 60%, and gives it back', () => {
  orcaHeader()
  byId('card').outerHTML =
    '<div id="card" style="max-height: 200px"><div id="ask" style="max-height: 120px"><div role="button">Carry color</div></div></div>'
  place(byId('chatview'), { top: 0, height: 600 })
  run(PILL)
  // The chat's bottom, less the bar (44) and the card's gap under it (8).
  expect(style('card', 'max-height')).toBe(`${600 - 44 - 8}px`)
  expect(style('ask', 'max-height')).toBe('120px') // the card's own parts keep theirs
  run(null)
  expect(style('card', 'max-height')).toBe('200px')
})

describe('the agent’s tab in the bar', () => {
  function touch(el: Element, type: string) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'touches', {
      value: type === 'touchend' ? [] : [{ clientX: 10, clientY: 10 }]
    })
    el.dispatchEvent(event)
  }
  function watched() {
    orcaHeader()
    byId('tabcell').innerHTML = '<div id="tabbutton" aria-label="Claude">CARD-009362 phase 2a</div>'
    run(PILL)
    const pressed: string[] = []
    // Orca's buttons, pressed by a click reaching them (React Native Web's onPress).
    byId('tabbutton').addEventListener('click', () => pressed.push('tab menu'))
    byId('block').addEventListener('click', () => pressed.push('worktree card'))
    return pressed
  }

  it('opens the worktree’s card on a tap, not the tab menu', () => {
    const pressed = watched()
    touch(byId('tabbutton'), 'touchstart')
    touch(byId('tabbutton'), 'touchend')
    byId('tabbutton').click()
    expect(pressed).toEqual(['worktree card'])
  })

  it('opens Orca’s tab menu on a hold, once', () => {
    vi.useFakeTimers()
    try {
      const pressed = watched()
      const posted: string[] = []
      Object.defineProperty(window, 'orcaBridge', {
        configurable: true,
        value: { postMessage: (json: string) => posted.push(json) }
      })
      touch(byId('tabbutton'), 'touchstart')
      vi.advanceTimersByTime(340)
      expect(pressed).toEqual([]) // not yet: a tap's still a tap
      vi.advanceTimersByTime(20)
      expect(pressed).toEqual(['tab menu'])
      expect(posted.filter(isHoldHapticMessage)).toHaveLength(1) // felt the moment it registers
      touch(byId('tabbutton'), 'touchend')
      byId('tabbutton').click() // the release's own click
      expect(pressed).toEqual(['tab menu'])
    } finally {
      vi.useRealTimers()
    }
  })
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
  expect(role('center')).toBe('ghost')
  expect(role('newcell')).toBe('hide')
})

it('leaves a sideways phone’s header, the tabs in the title’s row, as Orca has it', () => {
  orcaHeader()
  run(PILL)
  expect(role('chrome')).toBe('bar')
  // Turned sideways: the tab strip moves into the title row, between the title and the buttons.
  byId('bar').insertBefore(byId('strip'), byId('trailing'))
  place(byId('tabbar'), { top: 10, height: 36, width: 200 })
  place(byId('new'), { top: 10, height: 36, width: 36 })
  run(PILL)
  expect(
    document.querySelectorAll('[data-xeno-pill], [data-xeno-btn], [data-xeno-mode]')
  ).toHaveLength(0)
  expect(document.getElementById('xeno-pill-style')).toBeNull()
  expect(style('chrome', 'position')).toBe('')
  expect(style('chrome', 'padding-top')).toBe('67px')
  run(null)
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
  expect(style('chrome', 'position')).toBe('relative') // in the page's flow, the circles placed on the bar
  expect(style('chrome', 'padding-top')).toBe('26px') // at the very top still
  expect([style('leading', 'top'), style('trailing', 'top')]).toEqual(['26px', '26px']) // where they sit over a chat
  expect(style('chrome', 'margin-right')).toBe('84px') // clear of the column, as over a chat
  expect(style('chrome', 'height')).toBe('auto') // its row's height, not Orca's header's
  expect(role('chrome')).toBe('bar')
  expect(byId('chrome').getAttribute('data-xeno-mode')).toBe('flow')
  expect(role('center')).toBe('ghost')
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

it('holds the folded Duo’s full-screen toggle among its branch and menu circles, and says when it’s tapped', () => {
  orcaHeader()
  const posted: string[] = []
  Object.defineProperty(window, 'orcaBridge', {
    configurable: true,
    value: { postMessage: (json: string) => posted.push(json) }
  })
  run({ ...PILL, toggle: 'right', toggleLabel: 'Show the side keys' })
  const toggle = document.getElementById('xeno-column-toggle')!
  // One of the bar's circles, first in their row: laid out, layered and covered by menus as they are.
  expect(toggle.parentElement).toBe(byId('trailing'))
  expect(byId('trailing').firstElementChild).toBe(toggle)
  expect(toggle.getAttribute('data-xeno-btn')).toBe('mauve')
  const end = 14 + 22 + 8 + 22 + 8 // the menu and branch circles, and the gap before them
  expect(style('tabbar', 'right')).toBe(`${end + 22 + 8}px`) // the tab row stops short of it
  expect(toggle.getAttribute('aria-label')).toBe('Show the side keys')
  toggle.click()
  expect(posted.map((json) => JSON.parse(json).type)).toEqual(['xeno-column-toggle'])
  // A menu opening leaves it where it is, like the others.
  document.body.insertAdjacentHTML('beforeend', '<div aria-modal="true"></div>')
  run({ ...PILL, toggle: 'right', toggleLabel: 'Show the side keys' })
  expect(document.getElementById('xeno-column-toggle')).toBe(toggle)
  document.querySelector('[aria-modal]')!.remove()
  run(PILL) // the column back: the app draws its own
  expect(document.getElementById('xeno-column-toggle')).toBeNull()
  expect(style('tabbar', 'right')).toBe(`${end}px`)
})
