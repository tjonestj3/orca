import { useRouter } from 'expo-router'
import { ListRow } from '../components/list/ListGroup'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import {
  setMobileAppearancePreference,
  setMobileDarkTheme,
  setSessionMonospace,
  useMobileAppearancePreference,
  useMobileDarkTheme,
  useSessionMonospace,
  type MobileAppearancePreference
} from '../theme/mobile-appearance'
import type { MobileDarkTheme } from '../theme/mobile-theme'
import type { Translate } from '../i18n/mobile-i18n'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { SettingsScreen, SettingsSection } from './settings-screen-frame'
import { UiLanguageSettingsSection } from './ui-language-settings-section'

function appearanceOptions(t: Translate): { value: MobileAppearancePreference; label: string }[] {
  return [
    { value: 'system', label: t('settings.appearance.theme.system', 'System') },
    { value: 'light', label: t('settings.appearance.theme.light', 'Light') },
    { value: 'dark', label: t('settings.appearance.theme.dark', 'Dark') }
  ]
}

function darkThemeOptions(t: Translate): { value: MobileDarkTheme; label: string }[] {
  return [
    { value: 'orca', label: t('settings.appearance.darkTheme.orca', 'Orca') },
    { value: 'mocha', label: t('settings.appearance.darkTheme.mocha', 'Catppuccin Mocha') }
  ]
}

export default function AppearanceSettingsScreen() {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const router = useRouter()
  const preference = useMobileAppearancePreference()
  const darkTheme = useMobileDarkTheme()
  const monospace = useSessionMonospace()

  return (
    <SettingsScreen
      title={t('settings.appearance.title', 'Appearance')}
      onBack={() => router.back()}
    >
      <SettingsSection
        first
        radioGroup
        title={t('settings.appearance.theme.heading', 'THEME')}
        footer={t(
          'settings.appearance.theme.description',
          'System follows this device’s light or dark setting.'
        )}
      >
        {appearanceOptions(t).map(({ value, label }) => (
          <ListRow
            key={value}
            title={label}
            selected={preference === value}
            onPress={() => {
              void setMobileAppearancePreference(value).catch(() => {})
            }}
          />
        ))}
      </SettingsSection>

      <SettingsSection
        radioGroup
        title={t('settings.appearance.darkTheme.heading', 'DARK THEME')}
        footer={t(
          'settings.appearance.darkTheme.description',
          'Colors in dark mode, sessions included. Switching back to Orca shows in a session once it reopens.'
        )}
      >
        {darkThemeOptions(t).map(({ value, label }) => (
          <ListRow
            key={value}
            title={label}
            selected={darkTheme === value}
            onPress={() => {
              void setMobileDarkTheme(value).catch(() => {})
            }}
          />
        ))}
      </SettingsSection>

      <SettingsSection
        radioGroup
        title={t('settings.appearance.sessionFont.heading', 'SESSION TEXT')}
        footer={t(
          'settings.appearance.sessionFont.description',
          'Monospaced is how Moshi’s chat reads.'
        )}
      >
        <ListRow
          title={t('settings.appearance.sessionFont.standard', 'Standard')}
          selected={!monospace}
          onPress={() => {
            void setSessionMonospace(false).catch(() => {})
          }}
        />
        <ListRow
          title={t('settings.appearance.sessionFont.monospace', 'Monospaced')}
          selected={monospace}
          onPress={() => {
            void setSessionMonospace(true).catch(() => {})
          }}
        />
      </SettingsSection>

      <UiLanguageSettingsSection />
    </SettingsScreen>
  )
}
