import type { JarvisPhase } from '../jarvis-call-state'
import { CHESS_ORB } from './draw/chess'
import { HANDHELD_LCD_ORB } from './draw/handheld-lcd'
import { LAVA_LAMP_ORB } from './draw/lava-lamp'
import { NIXIE_ORB } from './draw/nixie'
import { OSCILLOSCOPE_ORB } from './draw/oscilloscope'
import { PAD_ORB } from './draw/pad'
import { PLANET_ORB } from './draw/planet'
import { RADAR_ORB } from './draw/radar'
import { TERMINAL_ORB } from './draw/terminal'
import { VINYL_ORB } from './draw/vinyl'

/**
 * Xeno's orb themes (Settings → Appearance → Xeno orb). Classic is the app's own orb (JarvisClassicOrb); each other
 * theme is a drawing (draw/*) the orb page runs (orb-page-core), so adding one is a module here and a line below.
 */
export const ORB_THEMES = {
  classic: { label: 'Classic', description: 'Turning rings around a glowing core.', drawing: null },
  terminal: {
    label: 'Terminal',
    description: 'A green phosphor prompt: your words type out, a spinner thinks.',
    drawing: TERMINAL_ORB
  },
  chess: {
    label: 'Chess',
    description: 'A knight on a round board; engine arrows while it thinks.',
    drawing: CHESS_ORB
  },
  handheldLcd: {
    label: 'Handheld LCD',
    description: 'A pixel orb on a four-shade green dot-matrix screen.',
    drawing: HANDHELD_LCD_ORB
  },
  pad: {
    label: '8-bit Pad',
    description: 'A d-pad and two red buttons that press as Xeno talks.',
    drawing: PAD_ORB
  },
  oscilloscope: {
    label: 'Oscilloscope',
    description: 'A scope trace that follows the voice.',
    drawing: OSCILLOSCOPE_ORB
  },
  radar: {
    label: 'Radar',
    description: 'A sweeping scope; blips flare as you talk.',
    drawing: RADAR_ORB
  },
  vinyl: {
    label: 'Vinyl',
    description: 'A spinning record whose label takes the state colour.',
    drawing: VINYL_ORB
  },
  nixie: {
    label: 'Nixie',
    description: 'One glowing digit that reads the voice level.',
    drawing: NIXIE_ORB
  },
  lavaLamp: {
    label: 'Lava Lamp',
    description: 'Soft blobs that swell with the voice.',
    drawing: LAVA_LAMP_ORB
  },
  planet: {
    label: 'Planet',
    description: 'A planet and its moon; the moon races while it thinks.',
    drawing: PLANET_ORB
  }
} as const satisfies Record<string, { label: string; description: string; drawing: string | null }>

export type OrbThemeId = keyof typeof ORB_THEMES

export const ORB_THEME_IDS: readonly OrbThemeId[] = [
  'classic',
  'terminal',
  'chess',
  'handheldLcd',
  'pad',
  'oscilloscope',
  'radar',
  'vinyl',
  'nixie',
  'lavaLamp',
  'planet'
]

export function isOrbThemeId(value: unknown): value is OrbThemeId {
  return typeof value === 'string' && ORB_THEME_IDS.some((id) => id === value)
}

/** What a theme draws for: its six states. */
export type OrbState = 'idle' | 'listening' | 'heard' | 'thinking' | 'speaking' | 'error'

/** The call's phase as a theme's state: connecting is busy like thinking, hearing you is "heard". */
export function orbState(phase: JarvisPhase): OrbState {
  switch (phase) {
    case 'idle':
      return 'idle'
    case 'connecting':
    case 'thinking':
      return 'thinking'
    case 'listening':
      return 'listening'
    case 'hearing':
      return 'heard'
    case 'speaking':
      return 'speaking'
    case 'error':
      return 'error'
  }
}
