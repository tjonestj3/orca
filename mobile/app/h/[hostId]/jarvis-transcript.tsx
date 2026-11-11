import { useLocalSearchParams } from 'expo-router'
import { JarvisTranscriptScreen } from '../../../src/jarvis/JarvisTranscriptScreen'

export default function JarvisTranscriptRoute() {
  const { hostId } = useLocalSearchParams<{ hostId: string }>()
  return <JarvisTranscriptScreen hostId={hostId} />
}
