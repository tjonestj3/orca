// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { pageRepaintScript } from './page-repaint'

const run = (script: string) => new Function(script)()

describe('the repaint script in a page', () => {
  it('repaints style rules already there, ones added after, and inline styles, and sets the font', async () => {
    document.head.innerHTML = ''
    document.body.innerHTML = '<div id="row" style="color: rgba(250,250,250,1.00)"></div>'
    const style = document.createElement('style')
    document.head.appendChild(style)
    style.sheet!.insertRule('.r-bg { background-color: rgba(10,10,10,1.00); }', 0)

    run(
      pageRepaintScript(
        [
          ['#0a0a0a', '#1e1e2e'],
          ['#fafafa', '#cdd6f4']
        ],
        true
      )
    )

    const rule = (index: number) => (style.sheet!.cssRules[index] as CSSStyleRule).style
    expect(rule(0).getPropertyValue('background-color')).toMatch(/#1e1e2e|rgb\(30, 30, 46\)/)
    expect(document.getElementById('row')!.getAttribute('style')).toContain('#cdd6f4')

    style.sheet!.insertRule('.r-c { color: rgba(250,250,250,1.00); }', 0)
    expect(rule(0).getPropertyValue('color')).toMatch(/#cdd6f4|rgb\(205, 214, 244\)/)

    const later = document.createElement('div')
    later.setAttribute('style', 'background-color: #0a0a0a')
    document.body.appendChild(later)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(later.getAttribute('style')).toContain('#1e1e2e')

    expect(document.getElementById('orca-repaint-font')).not.toBeNull()
  })

  it('can run again with new colours, and drops the font when it’s no longer wanted', () => {
    run(pageRepaintScript([['#0a0a0a', '#1e1e2e']], true))
    run(pageRepaintScript([['#0a0a0a', '#181825']], false))
    expect(document.getElementById('orca-repaint-font')).toBeNull()
  })

  it('goes from one theme straight to another, and back to Orca’s own', () => {
    document.head.innerHTML = ''
    document.body.innerHTML = '<div id="ground" style="background-color: #0a0a0a"></div>'
    const ground = () => document.getElementById('ground')!.getAttribute('style')
    run(pageRepaintScript([['#0a0a0a', '#1e1e2e']], false))
    expect(ground()).toContain('#1e1e2e')
    run(pageRepaintScript([['#0a0a0a', '#2e3440']], false))
    expect(ground()).toContain('#2e3440')
    run(pageRepaintScript([], false))
    expect(ground()).toContain('#0a0a0a')
  })

  it('colours inline code, and only inline code, in the theme’s colour', async () => {
    document.head.innerHTML = ''
    document.body.innerHTML =
      '<div><span id="prose">branch </span>' +
      '<span id="code" style="background-color: #45475a; border-top-width: 1px; border-style: solid">main</span>' +
      '<span id="mark" style="background-color: #45475a">highlight</span></div>'
    const code = { raised: '#45475a', text: '#f9e2af' }
    run(pageRepaintScript([['#262626', '#45475a']], false, code))
    const color = (id: string) => document.getElementById(id)!.style.getPropertyValue('color')
    expect(color('code')).toMatch(/#f9e2af|rgb\(249, 226, 175\)/)
    expect(color('prose')).toBe('')
    expect(color('mark')).toBe('')

    const later = document.createElement('span')
    later.setAttribute(
      'style',
      'background-color: #45475a; border-top-width: 1px; border-style: solid'
    )
    document.body.appendChild(later)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(later.style.getPropertyValue('color')).toMatch(/#f9e2af|rgb\(249, 226, 175\)/)

    run(pageRepaintScript([], false))
    expect(color('code')).toBe('')
  })
})
