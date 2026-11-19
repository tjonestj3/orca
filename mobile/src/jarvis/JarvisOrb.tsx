import { useSyncExternalStore } from 'react'
import { useOrbTheme } from '../theme/mobile-appearance'
import type { JarvisCall } from './jarvis-call'
import type { JarvisPhase } from './jarvis-call-state'
import { JarvisClassicOrb } from './JarvisClassicOrb'
import { JarvisThemedOrb } from './JarvisThemedOrb'
import { ORB_THEMES, orbState } from './orb-themes/orb-themes'

type Props = {
  readonly call: JarvisCall
  readonly phase: JarvisPhase
  readonly size: number
}

/** Xeno as an orb, in the theme chosen in Settings → Appearance → Xeno orb, moving with whoever is talking. */
export function JarvisOrb({ call, phase, size }: Props) {
  const levels = useSyncExternalStore(call.subscribeLevels, call.getLevels)
  const level = phase === 'speaking' ? levels.bot : phase === 'hearing' ? levels.user : 0
  return <ThemedOrb theme={useOrbTheme()} phase={phase} level={level} size={size} />
}

/** One theme's orb for a phase and level; Settings shows one with `demo`, which makes up a voice. */
export function ThemedOrb({
  theme,
  phase,
  level,
  size,
  demo = false
}: {
  readonly theme: keyof typeof ORB_THEMES
  readonly phase: JarvisPhase
  readonly level: number
  readonly size: number
  readonly demo?: boolean
}) {
  const drawing = ORB_THEMES[theme].drawing
  if (drawing === null) {
    return <JarvisClassicOrb phase={phase} level={level} size={size} />
  }
  return (
    <JarvisThemedOrb
      drawing={drawing}
      state={orbState(phase)}
      level={level}
      size={size}
      demo={demo}
    />
  )
}
