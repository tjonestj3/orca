import { describe, expect, it } from 'vitest'
import { MOCHA, ORCA_DARK_TO_MOCHA, mochaPalette } from './mocha-theme'
import { paletteForScheme } from './mobile-theme'

describe('Catppuccin Mocha over Orca’s dark colours', () => {
  const dark = paletteForScheme('dark')
  const mocha = mochaPalette(dark)

  it('puts the screen on Mocha’s base, its panels on mantle and its text on Mocha’s text', () => {
    expect(mocha.bgBase).toBe(MOCHA.base)
    expect(mocha.bgPanel).toBe(MOCHA.mantle)
    expect(mocha.textPrimary).toBe(MOCHA.text)
    expect(mocha.accentBlue).toBe(MOCHA.blue)
  })

  it('turns each Orca colour into one Mocha colour, wherever it’s used', () => {
    for (const key of Object.keys(dark) as (keyof typeof dark)[]) {
      const mapped = ORCA_DARK_TO_MOCHA[dark[key].toLowerCase()]
      expect(mocha[key]).toBe(mapped ?? dark[key])
    }
  })

  it('maps only to Mocha’s own colours', () => {
    const palette = new Set(Object.values(MOCHA))
    for (const to of Object.values(ORCA_DARK_TO_MOCHA)) {
      expect(palette.has(to)).toBe(true)
    }
  })
})
