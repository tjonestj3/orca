import { describe, expect, it } from 'vitest'
import { DARK_THEMES, DARK_THEME_IDS, isDarkThemeId } from './dark-themes'
import { MOCHA, themedPalette } from './mocha-theme'
import { paletteForScheme } from './mobile-theme'

describe('the dark themes', () => {
  it('each give a colour for every role Catppuccin has', () => {
    for (const id of DARK_THEME_IDS) {
      const colours: Record<string, string> = DARK_THEMES[id].colours
      for (const role of Object.keys(MOCHA)) {
        expect(colours[role], `${id}.${role}`).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('are all offered, each its own', () => {
    expect([...DARK_THEME_IDS].sort()).toEqual(Object.keys(DARK_THEMES).sort())
    const bases = new Set(DARK_THEME_IDS.map((id) => DARK_THEMES[id].colours.base))
    expect(bases.size).toBe(DARK_THEME_IDS.length)
  })

  it('keep their text readable on their own ground', () => {
    const lightness = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + Number.parseInt(hex.slice(i, i + 2), 16), 0) / 3
    for (const id of DARK_THEME_IDS) {
      const { base, surface1, text, yellow } = DARK_THEMES[id].colours
      expect(lightness(text) - lightness(base), id).toBeGreaterThan(120)
      expect(lightness(yellow) - lightness(surface1), `${id}: inline code`).toBeGreaterThan(60)
    }
  })

  it('paint the app as Orca’s colours’ roles say', () => {
    const nord = themedPalette(paletteForScheme('dark'), DARK_THEMES.nord.colours)
    expect(nord.bgBase).toBe('#2e3440')
    expect(nord.textPrimary).toBe('#eceff4')
  })

  it('are told apart from anything else a saved setting holds', () => {
    expect(isDarkThemeId('gruvbox')).toBe(true)
    expect(isDarkThemeId('orca')).toBe(false)
    expect(isDarkThemeId('solarized')).toBe(false)
    expect(isDarkThemeId(null)).toBe(false)
  })
})
