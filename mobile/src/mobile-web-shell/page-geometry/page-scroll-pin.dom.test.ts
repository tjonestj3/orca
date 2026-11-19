// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { PAGE_SCROLL_PIN } from './page-scroll-pin'

it('undoes the scroll iOS makes to show a focused field, and leaves other scrolling alone', async () => {
  document.body.innerHTML = '<div style="height: 5000px"><input id="composer" /></div>'
  new Function(PAGE_SCROLL_PIN)()
  new Function(PAGE_SCROLL_PIN)() // run again as each page loads: still one pin

  window.scrollTo(0, 120)
  window.dispatchEvent(new Event('scroll'))
  expect(window.scrollY).toBe(120)

  document.getElementById('composer')!.focus()
  window.scrollTo(0, 80)
  window.dispatchEvent(new Event('scroll'))
  expect(window.scrollY).toBe(0)
})
