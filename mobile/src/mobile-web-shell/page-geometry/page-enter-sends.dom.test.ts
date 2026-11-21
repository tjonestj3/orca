// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { pageEnterSendsScript } from './page-enter-sends'

function composer(extra = '') {
  document.body.innerHTML =
    '<div data-testid="native-chat-composer"><textarea id="box"></textarea>' +
    '<div id="send" aria-label="Send message"></div></div>' +
    extra
  new Function(pageEnterSendsScript(['Send message', 'Save edited message']))()
  const sent: string[] = []
  document.getElementById('send')!.addEventListener('click', () => sent.push('sent'))
  return sent
}

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...init
  })
  document.getElementById('box')!.dispatchEvent(event)
  return event
}

it('sends on the keyboard’s Return in a session’s composer, instead of a new line', () => {
  const sent = composer()
  const event = press({})
  expect(sent).toEqual(['sent'])
  expect(event.defaultPrevented).toBe(true)
})

it('leaves Shift+Return, text still being composed, and an open @ or / menu alone', () => {
  const sent = composer()
  expect(press({ shiftKey: true }).defaultPrevented).toBe(false)
  expect(press({ isComposing: true }).defaultPrevented).toBe(false)
  expect(sent).toEqual([])
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="menu" data-testid="native-chat-composer-menu-card"></div>'
  )
  document.getElementById('menu')!.getBoundingClientRect = () => ({ height: 120 }) as DOMRect
  expect(press({}).defaultPrevented).toBe(false)
  expect(sent).toEqual([])
})

it('marks the composer’s Return key as send', () => {
  composer()
  document.getElementById('box')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  expect(document.getElementById('box')!.getAttribute('enterkeyhint')).toBe('send')
})
