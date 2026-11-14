import AsyncStorage from '@react-native-async-storage/async-storage'

// Which voice Xeno answers in: a voice id from the desktop's list (/api/jarvis/voices), or "male" / "female",
// which the desktop maps to its first voice of that kind (what the app stored before it had a voice menu).
export type JarvisVoice = string

export const DEFAULT_JARVIS_VOICE: JarvisVoice = 'male'

const JARVIS_VOICE_KEY = 'orca:jarvisVoice'

export async function loadJarvisVoice(): Promise<JarvisVoice> {
  try {
    const stored = await AsyncStorage.getItem(JARVIS_VOICE_KEY)
    return stored && /^[a-z_]+$/.test(stored) ? stored : DEFAULT_JARVIS_VOICE
  } catch {
    return DEFAULT_JARVIS_VOICE
  }
}

export async function saveJarvisVoice(voice: JarvisVoice): Promise<void> {
  await AsyncStorage.setItem(JARVIS_VOICE_KEY, voice)
}
