import { describe, expect, it } from 'vitest'
import type { JarvisPhase } from '../jarvis-call-state'
import { ORB_THEME_IDS, ORB_THEMES, isOrbThemeId, orbState } from './orb-themes'

describe('the orb themes', () => {
  it('are all offered, Classic first, each its own', () => {
    expect([...ORB_THEME_IDS].sort()).toEqual(Object.keys(ORB_THEMES).sort())
    expect(ORB_THEME_IDS[0]).toBe('classic')
    expect(new Set(ORB_THEME_IDS.map((id) => ORB_THEMES[id].label)).size).toBe(ORB_THEME_IDS.length)
  })

  it('are told apart from anything else a saved setting holds', () => {
    expect(isOrbThemeId('nixie')).toBe(true)
    expect(isOrbThemeId('hal')).toBe(false)
    expect(isOrbThemeId(null)).toBe(false)
  })

  it('show every phase of a call as one of their six states', () => {
    const phases: JarvisPhase[] = [
      'idle',
      'connecting',
      'listening',
      'hearing',
      'thinking',
      'speaking',
      'error'
    ]
    expect(phases.map(orbState)).toEqual([
      'idle',
      'thinking',
      'listening',
      'heard',
      'thinking',
      'speaking',
      'error'
    ])
  })
})
