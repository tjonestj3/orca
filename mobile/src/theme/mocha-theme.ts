import type { MobilePalette } from './mobile-theme'

/** Catppuccin Mocha (catppuccin.com/palette), the theme Moshi's chat is in. */
export const MOCHA = {
  rosewater: '#f5e0dc',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b'
} as const

/**
 * Each of Orca's dark colours as Mocha has it, colour for colour, so the app's own screens and the session page
 * (Orca's, repainted) agree. See-through colours (borders, tints) read on Mocha as they are, and are left.
 */
export const ORCA_DARK_TO_MOCHA: Readonly<Record<string, string>> = {
  // Grounds: the screen, panels and sheets, raised controls and your own messages, the composer.
  '#0a0a0a': MOCHA.base,
  '#171717': MOCHA.mantle,
  '#1e1e1e': MOCHA.mantle,
  '#1a1b26': MOCHA.base,
  '#1f1f1f': MOCHA.surface0,
  '#262626': MOCHA.surface1,
  // Text, from strongest to faintest, and a field's edge.
  '#fafafa': MOCHA.text,
  '#e3e3e3': MOCHA.text,
  '#e5e5e5': MOCHA.subtext1,
  '#acacac': MOCHA.subtext0,
  '#898989': MOCHA.overlay1,
  '#737373': MOCHA.overlay0,
  // Accents and states; ink on a filled accent goes dark, since Mocha's fills are pale.
  '#3276f2': MOCHA.blue,
  '#8ab4f8': MOCHA.blue,
  '#ffffff': MOCHA.crust,
  '#86efac': MOCHA.green,
  '#16a34a': MOCHA.green,
  '#eab308': MOCHA.yellow,
  '#ff6568': MOCHA.red,
  '#450a0a': MOCHA.crust,
  '#d8b4fe': MOCHA.mauve,
  // Code.
  '#8b949e': MOCHA.overlay2,
  '#ff7b72': MOCHA.mauve,
  '#a5d6ff': MOCHA.green,
  '#79c0ff': MOCHA.peach,
  '#ffa657': MOCHA.yellow,
  '#d2a8ff': MOCHA.blue,
  '#7ee787': MOCHA.teal
}

export function mochaPalette(dark: MobilePalette): MobilePalette {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(dark)) {
    out[key] = ORCA_DARK_TO_MOCHA[value.toLowerCase()] ?? value
  }
  return out as MobilePalette
}
