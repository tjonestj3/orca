import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { ListRow } from '../components/list/ListGroup'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { ThemedOrb } from '../jarvis/JarvisOrb'
import type { JarvisPhase } from '../jarvis/jarvis-call-state'
import { ORB_THEME_IDS, ORB_THEMES } from '../jarvis/orb-themes/orb-themes'
import { setOrbTheme, useOrbTheme } from '../theme/mobile-appearance'
import { spacing } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { SettingsSection } from './settings-screen-frame'

const PREVIEW_ORB = 120
// The preview runs through what a call shows, a state every 2.5 s.
const PREVIEW_PHASES: readonly JarvisPhase[] = [
  'idle',
  'listening',
  'hearing',
  'thinking',
  'speaking',
  'error'
]
const PREVIEW_STEP_MS = 2500

/** Settings → Appearance → Xeno orb: the theme, previewed as it goes through a call. */
export function OrbThemeSettingsSection() {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const theme = useOrbTheme()
  const preview = usePreviewCall()
  return (
    <>
      <SettingsSection
        title={t('settings.appearance.orb.heading', 'XENO ORB')}
        footer={t(
          'settings.appearance.orb.description',
          'How Xeno looks everywhere it shows: its screen, beside the mic, the tab bar and the side rail.'
        )}
      >
        <View style={styles.preview}>
          <ThemedOrb
            theme={theme}
            phase={preview.phase}
            level={preview.level}
            size={PREVIEW_ORB}
            demo
          />
        </View>
      </SettingsSection>
      <SettingsSection radioGroup>
        {ORB_THEME_IDS.map((id) => (
          // Theme names are names, the same in every language.
          <ListRow
            key={id}
            title={ORB_THEMES[id].label}
            subtitle={ORB_THEMES[id].description}
            selected={theme === id}
            onPress={() => {
              void setOrbTheme(id).catch(() => {})
            }}
          />
        ))}
      </SettingsSection>
    </>
  )
}

/** A made-up call for the preview: the phases in turn, and for Classic a voice level (drawn themes make their own). */
function usePreviewCall(): { phase: JarvisPhase; level: number } {
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState(0)
  useEffect(() => {
    const phases = setInterval(() => setStep((n) => n + 1), PREVIEW_STEP_MS)
    const started = Date.now()
    const voice = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setLevel(Math.max(0, Math.min(1, 0.45 + 0.35 * Math.sin(s * 6.2) + 0.2 * Math.sin(s * 3.7))))
    }, 100)
    return () => {
      clearInterval(phases)
      clearInterval(voice)
    }
  }, [])
  const phase = PREVIEW_PHASES[step % PREVIEW_PHASES.length] ?? 'idle'
  return { phase, level: phase === 'speaking' || phase === 'hearing' ? level : 0 }
}

const styles = themedStyleSheet(() => ({
  preview: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg }
}))
