import { useLocalSearchParams } from 'expo-router'
import { JarvisScreen } from '../../../src/jarvis/JarvisScreen'

export default function JarvisRoute() {
  const { hostId } = useLocalSearchParams<{ hostId: string }>()
  return <JarvisScreen hostId={hostId} />
}
