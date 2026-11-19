// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { PAGE_QUESTION_ROOM, QUESTION_ROOM_SHARE } from './page-question-room'

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

afterEach(() => vi.restoreAllMocks())

// The test DOM knows no line clamp; WebKit reports it computed and takes it set, as stood in for here.
function clampAware(clamped: Element) {
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const style = computed(el)
    if (el !== clamped) {
      return style
    }
    // Everything as computed, but the clamp WebKit would report.
    const reported = Object.create(style)
    reported.getPropertyValue = (name: string) =>
      name === '-webkit-line-clamp' ? '3' : style.getPropertyValue(name)
    return reported
  })
  const set: string[] = []
  const setProperty = CSSStyleDeclaration.prototype.setProperty
  vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (
    this: CSSStyleDeclaration,
    name: string,
    value: string | null,
    priority?: string
  ) {
    if (name === '-webkit-line-clamp') {
      set.push(value ?? '')
    }
    return setProperty.call(this, name, value, priority)
  })
  return set
}

it('lets an agent’s question take most of the room under the conversation, its options read whole', () => {
  const height = window.innerHeight
  document.body.innerHTML =
    '<div id="lower"><div id="slot" style="max-height: 300px"><div>' +
    '<div id="option" role="radio"><span id="label">Phased specs</span>' +
    '<span id="description" style="-webkit-line-clamp: 3; overflow: hidden">A long description</span></div>' +
    '</div></div></div>'
  place(document.getElementById('lower')!, { top: height - 800, height: 800 })
  place(document.getElementById('option')!, { top: height - 300, height: 120 })

  const unclamped = clampAware(document.getElementById('description')!)
  new Function(PAGE_QUESTION_ROOM)()

  const slot = document.getElementById('slot')!
  expect(slot.style.getPropertyValue('max-height')).toBe(
    `${Math.round(800 * QUESTION_ROOM_SHARE)}px`
  )
  expect(unclamped).toEqual(['unset']) // the description only, not the label
})

it('leaves a page without a question alone', () => {
  document.body.innerHTML = '<div id="slot" style="max-height: 300px"><p>No question</p></div>'
  new Function(PAGE_QUESTION_ROOM)()
  expect(document.getElementById('slot')!.style.getPropertyValue('max-height')).toBe('300px')
})
