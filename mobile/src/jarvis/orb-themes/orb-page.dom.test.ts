// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { orbPageHtml } from './orb-page-html'
import { ORB_THEME_IDS, ORB_THEMES, type OrbState } from './orb-themes'

const STATES: OrbState[] = ['idle', 'listening', 'heard', 'thinking', 'speaking', 'error']

// The test DOM has no 2D canvas: this one takes every call, gives back what drawing code reads, and counts strokes.
function fakeContext(drawn: { count: number }) {
  const gradient = { addColorStop: () => undefined }
  const known: Record<string | symbol, unknown> = {
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4)
    }),
    measureText: () => ({ width: 10 }),
    fill: () => void (drawn.count += 1),
    stroke: () => void (drawn.count += 1),
    fillRect: () => void (drawn.count += 1),
    fillText: () => void (drawn.count += 1),
    drawImage: () => void (drawn.count += 1)
  }
  return new Proxy(known, {
    get: (target, key) => (key in target ? target[key] : () => undefined),
    set: (target, key, value) => {
      target[key] = value
      return true
    }
  })
}

afterEach(() => vi.restoreAllMocks())

function openPage(drawing: string, size: number) {
  const drawn = { count: 0 }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext(drawn))
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: size })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: size })
  const html = orbPageHtml(drawing)
  document.body.innerHTML = '<canvas id="orb"></canvas>'
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
  new Function(script)()
  const orb: { set: (next: object) => void; paint: (ms: number) => void; failed?: string } =
    Object.getOwnPropertyDescriptor(window, '__orb')?.value
  return { orb, drawn }
}

describe('each drawn orb theme', () => {
  for (const id of ORB_THEME_IDS) {
    const drawing = ORB_THEMES[id].drawing
    if (drawing === null) {
      continue
    }
    it(`${ORB_THEMES[id].label} draws every state, at every size the app shows it, with a voice`, () => {
      for (const size of [28, 60, 140]) {
        const { orb, drawn } = openPage(drawing, size)
        let ms = 1000
        for (const state of STATES) {
          orb.set({ state, level: 0.7 })
          for (let i = 0; i < 12; i++) {
            ms += 50
            orb.paint(ms)
          }
          expect(orb.failed, `${id} ${state} at ${size}`).toBeUndefined()
        }
        expect(drawn.count, `${id} at ${size}`).toBeGreaterThan(STATES.length * 12)
      }
    })
  }
})
