import { MOCHA, type ThemeColours } from './mocha-theme'

/**
 * The dark themes Settings → Appearance offers besides Orca's own, each in Catppuccin's colour roles. Catppuccin's
 * flavours are its published palettes; the others put their published colours in the nearest role, with a shade or
 * two between their grounds where they have fewer than Catppuccin's eleven.
 */
export const DARK_THEMES = {
  mocha: { label: 'Catppuccin Mocha', colours: MOCHA },
  macchiato: {
    label: 'Catppuccin Macchiato',
    colours: {
      rosewater: '#f4dbd6',
      mauve: '#c6a0f6',
      red: '#ed8796',
      maroon: '#ee99a0',
      peach: '#f5a97f',
      yellow: '#eed49f',
      green: '#a6da95',
      teal: '#8bd5ca',
      sky: '#91d7e3',
      sapphire: '#7dc4e4',
      blue: '#8aadf4',
      lavender: '#b7bdf8',
      text: '#cad3f5',
      subtext1: '#b8c0e0',
      subtext0: '#a5adcb',
      overlay2: '#939ab7',
      overlay1: '#8087a2',
      overlay0: '#6e738d',
      surface2: '#5b6078',
      surface1: '#494d64',
      surface0: '#363a4f',
      base: '#24273a',
      mantle: '#1e2030',
      crust: '#181926'
    }
  },
  frappe: {
    label: 'Catppuccin Frappé',
    colours: {
      rosewater: '#f2d5cf',
      mauve: '#ca9ee6',
      red: '#e78284',
      maroon: '#ea999c',
      peach: '#ef9f76',
      yellow: '#e5c890',
      green: '#a6d189',
      teal: '#81c8be',
      sky: '#99d1db',
      sapphire: '#85c1dc',
      blue: '#8caaee',
      lavender: '#babbf1',
      text: '#c6d0f5',
      subtext1: '#b5bfe2',
      subtext0: '#a5adce',
      overlay2: '#949cbb',
      overlay1: '#838ba7',
      overlay0: '#737994',
      surface2: '#626880',
      surface1: '#51576d',
      surface0: '#414559',
      base: '#303446',
      mantle: '#292c3c',
      crust: '#232634'
    }
  },
  tokyoNight: {
    label: 'Tokyo Night',
    colours: {
      rosewater: '#c0caf5',
      mauve: '#bb9af7',
      red: '#f7768e',
      maroon: '#ff7a93',
      peach: '#ff9e64',
      yellow: '#e0af68',
      green: '#9ece6a',
      teal: '#73daca',
      sky: '#7dcfff',
      sapphire: '#2ac3de',
      blue: '#7aa2f7',
      lavender: '#9d7cd8',
      text: '#c0caf5',
      subtext1: '#a9b1d6',
      subtext0: '#9aa5ce',
      overlay2: '#737aa2',
      overlay1: '#565f89',
      overlay0: '#545c7e',
      surface2: '#414868',
      surface1: '#3b4261',
      surface0: '#292e42',
      base: '#1a1b26',
      mantle: '#16161e',
      crust: '#101014'
    }
  },
  dracula: {
    label: 'Dracula',
    colours: {
      rosewater: '#f8f8f2',
      mauve: '#ff79c6',
      red: '#ff5555',
      maroon: '#ff6e6e',
      peach: '#ffb86c',
      yellow: '#f1fa8c',
      green: '#50fa7b',
      teal: '#8be9fd',
      sky: '#8be9fd',
      sapphire: '#8be9fd',
      blue: '#bd93f9',
      lavender: '#bd93f9',
      text: '#f8f8f2',
      subtext1: '#e2e2dc',
      subtext0: '#c5c8d6',
      overlay2: '#9aa5d0',
      overlay1: '#7c88bd',
      overlay0: '#6272a4',
      surface2: '#565970',
      surface1: '#44475a',
      surface0: '#343746',
      base: '#282a36',
      mantle: '#21222c',
      crust: '#191a21'
    }
  },
  nord: {
    label: 'Nord',
    colours: {
      rosewater: '#e5e9f0',
      mauve: '#b48ead',
      red: '#bf616a',
      maroon: '#c5727a',
      peach: '#d08770',
      yellow: '#ebcb8b',
      green: '#a3be8c',
      teal: '#8fbcbb',
      sky: '#88c0d0',
      sapphire: '#81a1c1',
      blue: '#88c0d0',
      lavender: '#81a1c1',
      text: '#eceff4',
      subtext1: '#e5e9f0',
      subtext0: '#d8dee9',
      overlay2: '#a5b1c4',
      overlay1: '#8892a6',
      overlay0: '#6d788d',
      surface2: '#4c566a',
      surface1: '#434c5e',
      surface0: '#3b4252',
      base: '#2e3440',
      mantle: '#292e39',
      crust: '#242933'
    }
  },
  gruvbox: {
    label: 'Gruvbox Dark',
    colours: {
      rosewater: '#ebdbb2',
      mauve: '#d3869b',
      red: '#fb4934',
      maroon: '#cc241d',
      peach: '#fe8019',
      yellow: '#fabd2f',
      green: '#b8bb26',
      teal: '#8ec07c',
      sky: '#83a598',
      sapphire: '#83a598',
      blue: '#83a598',
      lavender: '#d3869b',
      text: '#ebdbb2',
      subtext1: '#d5c4a1',
      subtext0: '#bdae93',
      overlay2: '#a89984',
      overlay1: '#928374',
      overlay0: '#7c6f64',
      surface2: '#665c54',
      surface1: '#504945',
      surface0: '#3c3836',
      base: '#282828',
      mantle: '#1d2021',
      crust: '#141617'
    }
  }
} as const satisfies Record<string, { label: string; colours: ThemeColours }>

export type DarkThemeId = keyof typeof DARK_THEMES

export const DARK_THEME_IDS: readonly DarkThemeId[] = [
  'mocha',
  'macchiato',
  'frappe',
  'tokyoNight',
  'dracula',
  'nord',
  'gruvbox'
]

export function isDarkThemeId(value: unknown): value is DarkThemeId {
  return typeof value === 'string' && DARK_THEME_IDS.some((id) => id === value)
}
