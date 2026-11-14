import AsyncStorage from '@react-native-async-storage/async-storage'

// Whether holding to talk uses the iPhone's own dictation (Apple's on-device recognizer) instead of sending the
// audio to the desktop's Whisper. On unless switched off; a phone that can't (no Apple Intelligence, the model
// not downloaded) keeps using the desktop either way.
const JARVIS_PHONE_DICTATION_KEY = 'orca:jarvisPhoneDictation'

export const DEFAULT_PHONE_DICTATION = true

export async function loadPhoneDictation(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(JARVIS_PHONE_DICTATION_KEY)
    return stored === null ? DEFAULT_PHONE_DICTATION : stored === 'on'
  } catch {
    return DEFAULT_PHONE_DICTATION
  }
}

export async function savePhoneDictation(on: boolean): Promise<void> {
  await AsyncStorage.setItem(JARVIS_PHONE_DICTATION_KEY, on ? 'on' : 'off')
}
