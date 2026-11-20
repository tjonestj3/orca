// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { BROWSER_KEYS_STYLE_ID, pageBrowserKeysScript } from './page-browser-keys'

// Orca's browser dock: the click modifiers' row, the keys' row, the typing field's row.
const DOCK =
  '<div id="dock"><div id="mods">' +
  ['Cmd', 'Ctrl', 'Alt', 'Shift']
    .map((k) => `<div aria-label="${k} click modifier">${k}</div>`)
    .join('') +
  '</div><div id="keys"><div>Enter</div><div>⌫</div><div>Tab</div><div>Esc</div></div>' +
  '<div id="field"><input /></div></div>'

const byId = (id: string) => document.getElementById(id)!
const run = () => new Function(pageBrowserKeysScript('Cmd click modifier'))()

it('puts a browser tab’s modifiers and keys on one line, the typing field on its own, and lets go after', () => {
  document.body.innerHTML = DOCK
  document.querySelectorAll('[aria-label]').forEach((el) => {
    el.getBoundingClientRect = () => ({ width: 40, height: 30 }) as DOMRect
  })
  run()
  expect(
    ['dock', 'mods', 'keys', 'field'].map((id) => byId(id).getAttribute('data-xeno-keys'))
  ).toEqual(['dock', 'mods', 'keys', null])
  const css = byId(BROWSER_KEYS_STYLE_ID).textContent!
  expect(css).toMatch(
    /\[data-xeno-keys="dock"\] \{ flex-direction: row !important; flex-wrap: wrap/
  )
  expect(css).toMatch(/> \*:not\(\[data-xeno-keys\]\) \{ flex: 0 0 100%/) // the field keeps its line

  document.body.innerHTML = '<p>A chat, no browser</p>'
  run()
  expect(document.getElementById(BROWSER_KEYS_STYLE_ID)).toBeNull()
})

it('leaves a row of modifiers alone where there’s no typing field with it', () => {
  document.body.innerHTML = DOCK.replace('<input />', '')
  document.querySelectorAll('[aria-label]').forEach((el) => {
    el.getBoundingClientRect = () => ({ width: 40, height: 30 }) as DOMRect
  })
  run()
  expect(byId('dock').getAttribute('data-xeno-keys')).toBeNull()
  expect(document.getElementById(BROWSER_KEYS_STYLE_ID)).toBeNull()
})
