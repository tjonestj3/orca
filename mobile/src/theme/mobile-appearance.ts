import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { AppState, Appearance } from 'react-native'
import { applyMobileColorScheme, applyMobileDarkTheme, type MobileDarkTheme } from './mobile-theme'
import { isDarkThemeId } from './dark-themes'
import { isOrbThemeId, type OrbThemeId } from '../jarvis/orb-themes/orb-themes'

// Same choices as desktop's theme setting; System follows the phone.
export type MobileAppearancePreference = 'system' | 'light' | 'dark'

const APPEARANCE_KEY = 'orca:appearance'

let preference: MobileAppearancePreference = 'system'
// A choice made while the saved one is still loading wins over the stale read.
let chosenThisLaunch = false
let started: Promise<void> | null = null
const preferenceListeners = new Set<() => void>()

function isAppearancePreference(value: unknown): value is MobileAppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

// Appearance carries the override too, so native alerts, pickers, the keyboard and WebViews match the app.
function applyAppearance(): void {
  // iOS flips the trait collection while snapshotting a backgrounded app; settle on return instead.
  if (AppState.currentState === 'background') {
    return
  }
  applyMobileColorScheme(Appearance.getColorScheme() === 'light' ? 'light' : 'dark')
}

function adoptPreference(next: MobileAppearancePreference): void {
  preference = next
  Appearance.setColorScheme(next === 'system' ? 'unspecified' : next)
  applyAppearance()
  for (const listener of preferenceListeners) {
    listener()
  }
}

// Resolves once the saved choice is applied, so the splash can cover the first themed frame.
export function startMobileAppearance(): Promise<void> {
  if (started !== null) {
    return started
  }
  applyAppearance()
  Appearance.addChangeListener(applyAppearance)
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      applyAppearance()
    }
  })
  started = Promise.all([
    AsyncStorage.getItem(APPEARANCE_KEY)
      .then((stored) => {
        if (!chosenThisLaunch && isAppearancePreference(stored) && stored !== preference) {
          adoptPreference(stored)
        }
      })
      .catch(() => undefined),
    AsyncStorage.getItem(DARK_THEME_KEY)
      .then((stored) => {
        if (isDarkThemeId(stored) && darkTheme === 'orca') {
          adoptDarkTheme(stored)
        }
      })
      .catch(() => undefined),
    AsyncStorage.getItem(SESSION_PILL_KEY)
      .then((stored) => {
        if (stored === 'off' && sessionPill) {
          sessionPill = false
          notifyPreferences()
        }
      })
      .catch(() => undefined),
    AsyncStorage.getItem(ORB_THEME_KEY)
      .then((stored) => {
        if (isOrbThemeId(stored) && orbTheme === 'classic') {
          orbTheme = stored
          notifyPreferences()
        }
      })
      .catch(() => undefined),
    AsyncStorage.getItem(SESSION_MONOSPACE_KEY)
      .then((stored) => {
        if (stored === 'on' && !sessionMonospace) {
          sessionMonospace = true
          notifyPreferences()
        }
      })
      .catch(() => undefined)
  ]).then(() => undefined)
  return started
}

// Orca's own dark colours or a theme's (dark-themes), on the app's screens and, repainted, Orca's session page.
const DARK_THEME_KEY = 'orca:darkTheme'
// Sessions in a monospaced font, as Moshi's chat is.
const SESSION_MONOSPACE_KEY = 'orca:sessionMonospace'
// Xeno's orb (jarvis/orb-themes): Classic, or one of the drawn themes.
const ORB_THEME_KEY = 'orca:orbTheme'
let darkTheme: MobileDarkTheme = 'orca'
let sessionMonospace = false
let orbTheme: OrbThemeId = 'classic'
// A session's header floating over its chat as one pill, like Moshi's (page-pill-header), or Orca's own.
const SESSION_PILL_KEY = 'orca:sessionPill'
let sessionPill = true

function notifyPreferences(): void {
  for (const listener of preferenceListeners) {
    listener()
  }
}

function adoptDarkTheme(next: MobileDarkTheme): void {
  darkTheme = next
  applyMobileDarkTheme(next)
  notifyPreferences()
}

export function setMobileDarkTheme(next: MobileDarkTheme): Promise<void> {
  adoptDarkTheme(next)
  return AsyncStorage.setItem(DARK_THEME_KEY, next)
}

export function useMobileDarkTheme(): MobileDarkTheme {
  return useSyncExternalStore(subscribePreference, () => darkTheme)
}

export function setSessionMonospace(on: boolean): Promise<void> {
  sessionMonospace = on
  notifyPreferences()
  return AsyncStorage.setItem(SESSION_MONOSPACE_KEY, on ? 'on' : 'off')
}

export function useSessionMonospace(): boolean {
  return useSyncExternalStore(subscribePreference, () => sessionMonospace)
}

export function setSessionPill(on: boolean): Promise<void> {
  sessionPill = on
  notifyPreferences()
  return AsyncStorage.setItem(SESSION_PILL_KEY, on ? 'on' : 'off')
}

export function useSessionPill(): boolean {
  return useSyncExternalStore(subscribePreference, () => sessionPill)
}

export function setOrbTheme(next: OrbThemeId): Promise<void> {
  orbTheme = next
  notifyPreferences()
  return AsyncStorage.setItem(ORB_THEME_KEY, next)
}

export function useOrbTheme(): OrbThemeId {
  return useSyncExternalStore(subscribePreference, () => orbTheme)
}

export function setMobileAppearancePreference(next: MobileAppearancePreference): Promise<void> {
  chosenThisLaunch = true
  adoptPreference(next)
  return AsyncStorage.setItem(APPEARANCE_KEY, next)
}

function subscribePreference(listener: () => void): () => void {
  preferenceListeners.add(listener)
  return () => {
    preferenceListeners.delete(listener)
  }
}

export function useMobileAppearancePreference(): MobileAppearancePreference {
  return useSyncExternalStore(subscribePreference, () => preference)
}
