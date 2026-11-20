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
  top: 8,
  left: 8,
  right: 92,
  background: '#1a1b26'
}

it('floats the session header as one pill over the chat, which starts below it, and puts it all back', () => {
  document.body.innerHTML =
    '<div id="pane">' +
    '<div id="top"><div id="chrome" style="padding-top: 67px">' +
    '<div id="nav"><div id="more" aria-label="More session actions"></div></div>' +
    '<div id="tabs" style="border-top: 1px solid #333"><div id="new" aria-label="New tab"></div></div>' +
    '</div></div>' +
    '<div id="chatview" data-testid="native-chat-view"><div id="chat" style="overflow-y: auto"><div id="content"><p>hello</p></div></div></div>' +
    '</div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })

  new Function(pagePillHeaderScript(PILL))()
  const chrome = byId('chrome').style
  expect(chrome.getPropertyValue('position')).toBe('absolute')
  expect(chrome.getPropertyValue('right')).toBe('92px')
  expect(chrome.getPropertyValue('padding-top')).toBe('4px')
  expect(chrome.getPropertyValue('border-radius')).toBe('22px')
  expect(byId('tabs').style.getPropertyValue('border-top-width')).toBe('0px')
  expect(byId('content').style.getPropertyValue('padding-top')).toBe(`${84 + 8 + 8}px`)

  new Function(pagePillHeaderScript(null))() // Standard header, or a terminal
  expect(chrome.getPropertyValue('position')).toBe('')
  expect(chrome.getPropertyValue('padding-top')).toBe('67px') // as the page had it
  expect(byId('content').style.getPropertyValue('padding-top')).toBe('')
})

it('leaves a page without a session header alone', () => {
  document.body.innerHTML = '<div id="x" style="padding-top: 4px"><p>No header</p></div>'
  new Function(pagePillHeaderScript(PILL))()
  expect(document.getElementById('x')!.style.getPropertyValue('padding-top')).toBe('4px')
})

it('pads the transcript, not the lower region a tall question scrolls in, and lifts the pill above the chat', () => {
  document.body.innerHTML =
    '<div id="pane">' +
    '<div id="top"><div id="chrome">' +
    '<div><div id="more" aria-label="More session actions"></div></div>' +
    '<div><div id="new" aria-label="New tab"></div></div>' +
    '</div></div>' +
    '<div id="chatview" data-testid="native-chat-view">' +
    '<div id="chat" style="overflow-y: auto"><div id="content"></div></div>' +
    '<div data-testid="native-chat-lower-scroll" id="lower" style="overflow-y: auto"><div id="card"></div></div>' +
    '</div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight * 0.35 })
  // A tall question: the lower region is the bigger scroller now.
  place(byId('lower'), { top: window.innerHeight * 0.35, height: window.innerHeight * 0.6 })

  new Function(pagePillHeaderScript(PILL))()
  expect(byId('content').style.getPropertyValue('padding-top')).toBe('100px')
  expect(byId('card').style.getPropertyValue('padding-top')).toBe('')
  expect(byId('top').style.getPropertyValue('z-index')).toBe('20')
  expect(byId('pane').style.getPropertyValue('z-index')).toBe('') // shared with the chat: left alone
})

it('keeps only icons and words inside the pill: no button or tab fills, no rules across its rows', () => {
  document.body.innerHTML =
    '<div id="pane"><div id="top" style="border-bottom: 1px solid #333"><div id="chrome">' +
    '<div><div id="more" aria-label="More session actions" style="background-color: #262626"></div></div>' +
    '<div id="tabs" style="border-top: 1px solid #333"><div id="tab" style="background-color: #262626; border-bottom: 2px solid #aaa">Xeno</div>' +
    '<div id="count" style="border: 1.5px solid #fff">2</div><div id="new" aria-label="New tab"></div></div>' +
    '</div></div><div id="chatview" data-testid="native-chat-view"><div id="chat" style="overflow-y: auto"><div id="content"></div></div></div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('tab'), { top: 52, height: 40, width: 300 })
  place(byId('count'), { top: 56, height: 24, width: 24 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })

  new Function(pagePillHeaderScript(PILL))()
  expect(byId('more').style.getPropertyValue('background-color')).toBe('transparent')
  expect(byId('tab').style.getPropertyValue('background-color')).toBe('transparent')
  expect(byId('tab').style.getPropertyValue('border-bottom-width')).toBe('0px')
  expect(byId('count').style.getPropertyValue('border-top-width')).toBe('1.5px') // the count keeps its box
  expect(byId('top').style.getPropertyValue('border-bottom-width')).toBe('0px')

  new Function(pagePillHeaderScript(null))()
  expect(byId('tab').style.getPropertyValue('background-color')).toMatch(
    /#262626|rgb\(38, 38, 38\)/
  ) // as the page had it
})

it('when it comes off, gives the header back as the page last set it, not as it was when the pill went on', () => {
  // The page's header before it has measured itself: pushed down the camera's height, full width.
  document.body.innerHTML =
    '<div id="pane"><div id="top"><div id="chrome" style="padding-top: 67px">' +
    '<div><div id="more" aria-label="More session actions"></div></div>' +
    '<div><div id="new" aria-label="New tab"></div></div>' +
    '</div></div><div id="chatview" data-testid="native-chat-view"><div id="chat" style="overflow-y: auto"><div id="content"></div></div></div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })
  new Function(pagePillHeaderScript(PILL))()

  // Measured, the page sets its header beside the camera, under the pill (React writes plain inline styles).
  const chrome = byId('chrome').style
  chrome.paddingTop = '0px'
  chrome.paddingRight = '84px'
  new Function(pagePillHeaderScript(PILL))()
  expect(chrome.getPropertyValue('padding-top')).toBe('4px') // still the pill's

  new Function(pagePillHeaderScript(null))() // switched to the terminal
  expect(chrome.getPropertyValue('padding-top')).toBe('0px')
  expect(chrome.getPropertyValue('padding-right')).toBe('84px')
})

it('leaves a terminal’s header as Orca draws it: only a chat scrolls under the pill', () => {
  document.body.innerHTML =
    '<div id="pane"><div id="top"><div id="chrome" style="padding-top: 0px">' +
    '<div><div id="more" aria-label="More session actions"></div></div>' +
    '<div><div id="new" aria-label="New tab"></div></div>' +
    '</div></div><div id="terminal" class="xterm"></div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  new Function(pagePillHeaderScript(PILL))() // the app still thought a chat was showing
  expect(byId('chrome').style.getPropertyValue('position')).toBe('')
  expect(byId('chrome').style.getPropertyValue('padding-top')).toBe('0px')
})

it('lays the header out on one line: back, title, tab count, branch and menu, and puts it all back', () => {
  // Orca's session header: the nav bar (back, the title and branch line, the branch and ⋯ buttons) over the tab
  // strip (the agent's tab, the tab count, +).
  document.body.innerHTML =
    '<div id="pane"><div id="top"><div id="chrome">' +
    '<div id="nav"><div id="bar" style="display: flex; flex-direction: row">' +
    '<div id="leading" style="flex: 1 1 0px"><div aria-label="Back"></div></div>' +
    '<div id="center" style="align-items: center">card-009362<br>feature/CARD-009362</div>' +
    '<div id="trailing"><div aria-label="Branch"></div><div id="more" aria-label="More session actions"></div></div>' +
    '</div></div>' +
    '<div id="strip"><div id="tabbar" style="display: flex; flex-direction: row">' +
    '<div id="tabcell">CARD-009362 phase 2a</div><div id="count">2</div><div id="newcell"><div id="new" aria-label="New tab"></div></div>' +
    '</div></div>' +
    '</div></div><div id="chatview" data-testid="native-chat-view"><div id="chat" style="overflow-y: auto"><div id="content"></div></div></div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('bar'), { top: 8, height: 44 })
  place(byId('tabbar'), { top: 52, height: 40 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })

  new Function(pagePillHeaderScript(PILL))()
  const style = (id: string, prop: string) => byId(id).style.getPropertyValue(prop)
  expect(style('chrome', 'display')).toBe('flex')
  expect(style('chrome', 'flex-direction')).toBe('row')
  for (const id of ['nav', 'bar', 'strip', 'tabbar']) {
    expect(style(id, 'display')).toBe('contents')
  }
  expect([
    style('leading', 'order'),
    style('center', 'order'),
    style('count', 'order'),
    style('trailing', 'order')
  ]).toEqual(['1', '2', '3', '4'])
  expect(style('center', 'align-items')).toBe('stretch')
  expect(style('tabcell', 'display')).toBe('none')
  expect(style('newcell', 'display')).toBe('none')
  expect(style('center', 'font-family')).toMatch(/-apple-system/)
  expect(style('chrome', 'min-height')).toBe('52px')

  // Hidden, the new tab button has no box; the flattened rows have none either. Checked again (the page changed
  // as you typed), it stays one pill, shaped the same, rather than coming off and going back on.
  place(byId('new'), { top: 0, height: 0, width: 0 })
  place(byId('bar'), { top: 0, height: 0, width: 0 })
  place(byId('tabbar'), { top: 0, height: 0, width: 0 })
  byId('center').append(' ')
  new Function(pagePillHeaderScript(PILL))()
  expect(style('chrome', 'position')).toBe('absolute')
  expect(style('chrome', 'display')).toBe('flex')
  expect(style('chrome', 'min-height')).toBe('52px')
  expect(style('newcell', 'display')).toBe('none')

  new Function(pagePillHeaderScript(null))()
  expect(style('chrome', 'display')).toBe('')
  expect(style('chrome', 'background-color')).toBe('') // not the pill's own colour, read back as the browser keeps it
  expect(style('bar', 'display')).toBe('flex')
  expect(style('tabcell', 'display')).toBe('')
  expect(style('center', 'align-items')).toBe('center')
  expect(style('leading', 'flex')).toMatch(/^1 1 0(px)?$/)
})

it('when the page restyles its header just before the pill comes off, the page’s style stands', () => {
  document.body.innerHTML =
    '<div id="pane"><div id="top"><div id="chrome" style="padding-top: 67px">' +
    '<div><div id="more" aria-label="More session actions"></div></div>' +
    '<div><div id="new" aria-label="New tab"></div></div>' +
    '</div></div><div id="chatview" data-testid="native-chat-view"><div id="chat" style="overflow-y: auto"><div id="content"></div></div></div></div>'
  const byId = (id: string) => document.getElementById(id)!
  place(byId('more'), { top: 10, height: 36, width: 36 })
  place(byId('new'), { top: 60, height: 36, width: 36 })
  place(byId('chrome'), { top: 8, height: 84 })
  place(byId('chatview'), { top: 0, height: window.innerHeight })
  place(byId('chat'), { top: 0, height: window.innerHeight })
  new Function(pagePillHeaderScript(PILL))()

  // Switching to the terminal, Orca re-measures its header in the same moment the pill is told to come off.
  byId('chrome').style.paddingTop = '12px'
  new Function(pagePillHeaderScript(null))()
  expect(byId('chrome').style.getPropertyValue('padding-top')).toBe('12px')
})
