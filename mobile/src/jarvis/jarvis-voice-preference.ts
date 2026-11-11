import AsyncStorage from '@react-native-async-storage/async-storage'

// Which voice Jarvis answers in; the desktop maps it to a concrete voice.
export type JarvisVoice = 'male' | 'female'

const JARVIS_VOICE_KEY = 'orca:jarvisVoice'

export async function loadJarvisVoice(): Promise<JarvisVoice> {
  try {
    return (await AsyncStorage.getItem(JARVIS_VOICE_KEY)) === 'female' ? 'female' : 'male'
  } catch {
    return 'male'
  }
}

export async function saveJarvisVoice(voice: JarvisVoice): Promise<void> {
  await AsyncStorage.setItem(JARVIS_VOICE_KEY, voice)
}
