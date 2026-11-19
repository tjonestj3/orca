import { describe, expect, it } from 'vitest'
import { REPAINT_CORE, pageRepaintScript } from './page-repaint'

// The page's styles as React Native Web writes them: colours as rgba() with two decimals.
const repaintText = new Function(`${REPAINT_CORE}; return repaintText`)() as (
  text: string,
  map: Record<string, string>
) => string
const keyOf = new Function(`${REPAINT_CORE}; return colourKey`)() as (
  token: string
) => string | null

describe('repainting the session page', () => {
  const map = { [keyOf('#0a0a0a')!]: '#1e1e2e', [keyOf('#fafafa')!]: '#cdd6f4' }

  it('swaps Orca’s colours however the page writes them', () => {
    expect(repaintText('background-color:rgba(10,10,10,1.00);', map)).toBe(
      'background-color:#1e1e2e;'
    )
    expect(repaintText('color: #FAFAFA', map)).toBe('color: #cdd6f4')
    expect(repaintText('border: 1px solid rgb(250, 250, 250)', map)).toBe(
      'border: 1px solid #cdd6f4'
    )
  })

  it('leaves other colours, and see-through versions of Orca’s, alone', () => {
    expect(repaintText('color: rgba(10,10,10,0.50)', map)).toBe('color: rgba(10,10,10,0.50)')
    expect(repaintText('color: #3fb950', map)).toBe('color: #3fb950')
  })

  it('is a script the page can run, carrying the colours and the font choice', () => {
    const script = pageRepaintScript([['#0a0a0a', '#1e1e2e']], true)
    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('#1e1e2e')
    expect(script).toContain('monospace')
    expect(() => new Function(pageRepaintScript([], false))).not.toThrow()
  })
})
