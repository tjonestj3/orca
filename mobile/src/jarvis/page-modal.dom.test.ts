// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { PAGE_MODAL_WATCH, readPageModalMessage } from './page-modal'

// The page's change notice comes after this frame is asked for, and the check a frame after that.
const settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

it('tells the app when the page opens a sheet and when it closes, once each', async () => {
  const posted: (boolean | null)[] = []
  Object.defineProperty(window, 'orcaBridge', {
    configurable: true,
    value: { postMessage: (json: string) => posted.push(readPageModalMessage(json)) }
  })
  document.body.innerHTML = '<div id="page"></div>'
  new Function(PAGE_MODAL_WATCH)()
  expect(posted).toEqual([false])

  // React Native Web's Modal, as the tab menu opens it.
  const sheet = document.createElement('div')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('role', 'dialog')
  document.body.appendChild(sheet)
  await settle()
  document.getElementById('page')!.appendChild(document.createElement('span'))
  await settle()
  expect(posted).toEqual([false, true])

  sheet.remove()
  await settle()
  expect(posted).toEqual([false, true, false])

  new Function(PAGE_MODAL_WATCH)()
  expect(posted).toEqual([false, true, false, false]) // run again (a new page, or a theme change): says so again
})
