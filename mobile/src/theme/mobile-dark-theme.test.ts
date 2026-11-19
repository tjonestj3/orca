import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T>(styles: T) => styles },
  Platform: { OS: 'ios', select: (choices: { ios?: unknown; default?: unknown }) => choices.ios }
}))

const {
  applyMobileColorScheme,
  applyMobileDarkTheme,
  colors,
  getMobilePaletteKey,
  paletteForScheme,
  subscribeMobileColorScheme
} = await import('./mobile-theme')
const { MOCHA } = await import('./mocha-theme')
const { themedStyles } = await import('./themed-styles')

afterEach(() => {
  applyMobileDarkTheme('orca')
  applyMobileColorScheme('dark')
})

describe('the dark theme', () => {
  it('paints the app in Mocha while it’s dark, and Orca’s own again when switched back', () => {
    applyMobileDarkTheme('mocha')
    expect(colors.bgBase).toBe(MOCHA.base)
    expect(getMobilePaletteKey()).toBe('mocha')
    applyMobileDarkTheme('orca')
    expect(colors.bgBase).toBe(paletteForScheme('dark').bgBase)
  })

  it('leaves light mode as it is', () => {
    applyMobileColorScheme('light')
    applyMobileDarkTheme('mocha')
    expect(colors.bgBase).toBe(paletteForScheme('light').bgBase)
    expect(getMobilePaletteKey()).toBe('light')
    applyMobileColorScheme('dark')
    expect(colors.bgBase).toBe(MOCHA.base)
  })

  it('repaints styles built from the colours, and tells screens to', () => {
    const styles = themedStyles(() => ({ screen: { backgroundColor: colors.bgBase } }))
    let told = 0
    const stop = subscribeMobileColorScheme(() => (told += 1))
    applyMobileDarkTheme('mocha')
    expect(styles.screen.backgroundColor).toBe(MOCHA.base)
    expect(told).toBe(1)
    stop()
  })
})
