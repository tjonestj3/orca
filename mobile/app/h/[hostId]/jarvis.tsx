import { useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { JarvisScreen } from '../../../src/jarvis/JarvisScreen'
import { useJarvis } from '../../../src/jarvis/JarvisProvider'

export default function JarvisRoute() {
  const { hostId } = useLocalSearchParams<{ hostId: string }>()
  const { adoptHost } = useJarvis()
  // Opening Jarvis for a computer makes it the one the bubble and the app-wide call talk to.
  useEffect(() => {
    if (hostId) {
      adoptHost(hostId)
    }
  }, [adoptHost, hostId])
  return <JarvisScreen hostId={hostId} />
}
