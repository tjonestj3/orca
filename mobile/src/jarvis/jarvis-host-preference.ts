import AsyncStorage from '@react-native-async-storage/async-storage'

// The one computer Jarvis talks to: the one Jarvis was last opened for.
const JARVIS_HOST_KEY = 'orca:jarvisHostId'

export async function loadJarvisHost(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(JARVIS_HOST_KEY)
  } catch {
    return null
  }
}

export async function rememberJarvisHost(hostId: string): Promise<void> {
  await AsyncStorage.setItem(JARVIS_HOST_KEY, hostId)
}
