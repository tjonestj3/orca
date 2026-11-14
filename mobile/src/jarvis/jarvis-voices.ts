import { useEffect, useState } from 'react'
import type { JarvisVoice } from './jarvis-voice-preference'

// A voice Xeno can speak in, as the desktop lists it (/api/jarvis/voices).
export type JarvisVoiceOption = {
  readonly id: string
  readonly name: string
  readonly kind: 'male' | 'female' | ''
  // Pocket voices start speaking in about a tenth of a second; Kokoro ones in about a second.
  readonly fast: boolean
  readonly about: string
  readonly isDefault: boolean
}

// What a desktop running an older Xeno, without the list, still understands.
export const FALLBACK_VOICES: readonly JarvisVoiceOption[] = [
  { id: 'male', name: 'Male', kind: 'male', fast: true, about: '', isDefault: true },
  { id: 'female', name: 'Female', kind: 'female', fast: false, about: '', isDefault: false }
]

const FETCH_TIMEOUT_MS = 4000

export function parseJarvisVoices(raw: unknown): JarvisVoiceOption[] {
  const list = (raw as { voices?: unknown } | null)?.voices
  if (!Array.isArray(list)) {
    return []
  }
  return list.flatMap((item): JarvisVoiceOption[] => {
    const entry = item as Record<string, unknown> | null
    if (!entry || typeof entry.id !== 'string' || !/^[a-z_]+$/.test(entry.id)) {
      return []
    }
    return [
      {
        id: entry.id,
        name: typeof entry.name === 'string' && entry.name ? entry.name : entry.id,
        kind: entry.kind === 'male' || entry.kind === 'female' ? entry.kind : '',
        fast: entry.fast === true,
        about: typeof entry.about === 'string' ? entry.about : '',
        isDefault: entry.default === true
      }
    ]
  })
}

// The voice a stored choice means: "male" and "female" are the first of that kind, as on the desktop.
export function chosenVoice(
  voice: JarvisVoice,
  options: readonly JarvisVoiceOption[]
): JarvisVoiceOption | null {
  return (
    options.find((option) => option.id === voice) ??
    options.find((option) => option.kind === voice) ??
    null
  )
}

// The menu row's second line: "Fast · female", "Kokoro · male · the first Jarvis voice".
export function voiceDetail(option: JarvisVoiceOption): string {
  return [option.fast ? 'Fast' : 'Kokoro', option.kind, option.about].filter(Boolean).join(' · ')
}

// The desktop's voices, fetched once `url` is set; the fallback pair if it has no list (an older Xeno).
export function useJarvisVoices(url: string | null): readonly JarvisVoiceOption[] {
  const [voices, setVoices] = useState<readonly JarvisVoiceOption[]>(FALLBACK_VOICES)
  useEffect(() => {
    if (!url) {
      return
    }
    let stopped = false
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS)
    void fetch(url, { signal: abort.signal })
      .then(async (response) => (response.ok ? parseJarvisVoices(await response.json()) : []))
      .catch(() => [])
      .then((listed) => {
        if (!stopped && listed.length > 0) {
          setVoices(listed)
        }
      })
      .finally(() => clearTimeout(timer))
    return () => {
      stopped = true
      abort.abort()
    }
  }, [url])
  return voices
}
