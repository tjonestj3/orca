import type { MobilePalette } from './mobile-theme'

/** Catppuccin Mocha (catppuccin.com/palette), the theme Moshi's chat is in. Its colour roles name every theme's. */
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

export type ThemeRole = keyof typeof MOCHA
/** A dark theme's colour for each of Catppuccin's roles: grounds from crust up, text, and accents. */
export type ThemeColours = Readonly<Record<ThemeRole, string>>

/**
 * Each of Orca's dark colours as the role it plays, so a theme paints the app's own screens and the session page
 * (Orca's, repainted) alike. See-through colours (borders, tints) read on any dark ground as they are, and are left.
 */
export const ORCA_DARK_ROLES: Readonly<Record<string, ThemeRole>> = {
  // Grounds: the screen, panels and sheets, raised controls and your own messages, the composer.
  '#0a0a0a': 'base',
  '#171717': 'mantle',
  '#1e1e1e': 'mantle',
  '#1a1b26': 'base',
  '#1f1f1f': 'surface0',
  '#262626': 'surface1',
  // Text, from strongest to faintest, and a field's edge.
  '#fafafa': 'text',
  '#e3e3e3': 'text',
  '#e5e5e5': 'subtext1',
  '#acacac': 'subtext0',
  '#898989': 'overlay1',
  '#737373': 'overlay0',
  // Accents and states; ink on a filled accent goes dark, since these themes' fills are pale.
  '#3276f2': 'blue',
  '#8ab4f8': 'blue',
  '#ffffff': 'crust',
  '#86efac': 'green',
  '#16a34a': 'green',
  '#eab308': 'yellow',
  '#ff6568': 'red',
  '#450a0a': 'crust',
  '#d8b4fe': 'mauve',
  // Code.
  '#8b949e': 'overlay2',
  '#ff7b72': 'mauve',
  '#a5d6ff': 'green',
  '#79c0ff': 'peach',
  '#ffa657': 'yellow',
  '#d2a8ff': 'blue',
  '#7ee787': 'teal'
}

/** The ground Orca's inline code sits on (bgRaised): the session page's script finds inline code by it. */
export const ORCA_RAISED = '#262626'

/** Orca's dark colours and the theme's in their place, for repainting the session page. */
export function themePairs(theme: ThemeColours): [string, string][] {
  return Object.entries(ORCA_DARK_ROLES).map(([orca, role]) => [orca, theme[role]])
}

function isPaletteKey(key: string, palette: MobilePalette): key is keyof MobilePalette {
  return key in palette
}

/** Orca's dark palette with each colour it maps swapped for the theme's. */
export function themedPalette(dark: MobilePalette, theme: ThemeColours): MobilePalette {
  const swapped: Partial<Record<keyof MobilePalette, string>> = {}
  for (const key of Object.keys(dark)) {
    if (isPaletteKey(key, dark)) {
      const role = ORCA_DARK_ROLES[dark[key].toLowerCase()]
      if (role !== undefined) {
        swapped[key] = theme[role]
      }
    }
  }
  return { ...dark, ...swapped }
}

export const ORCA_DARK_TO_MOCHA: Readonly<Record<string, string>> = Object.fromEntries(
  themePairs(MOCHA)
)

export function mochaPalette(dark: MobilePalette): MobilePalette {
  return themedPalette(dark, MOCHA)
}
