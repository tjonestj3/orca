import { useSyncExternalStore } from 'react'
import { getMobileUiRevision, subscribeMobileUiLanguage } from '../i18n/mobile-i18n'
import {
  getMobileColorScheme,
  getMobilePaletteKey,
  subscribeMobileColorScheme,
  type MobileColorScheme
} from './mobile-theme'

// Call in every component that reads `colors` or themed styles while rendering, so a scheme change repaints it.
// A language switch repaints the same components, so labels built by helpers during render follow it too.
export function useMobileColorScheme(): MobileColorScheme {
  useSyncExternalStore(subscribeMobileUiLanguage, getMobileUiRevision)
  // The dark theme changes the palette without changing the scheme: repaint on it too.
  useSyncExternalStore(subscribeMobileColorScheme, getMobilePaletteKey)
  return useSyncExternalStore(subscribeMobileColorScheme, getMobileColorScheme)
}
