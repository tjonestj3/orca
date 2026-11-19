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
})
