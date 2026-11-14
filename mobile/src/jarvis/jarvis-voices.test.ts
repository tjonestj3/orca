import { describe, expect, it } from 'vitest'
import { chosenVoice, FALLBACK_VOICES, parseJarvisVoices, voiceDetail } from './jarvis-voices'

const LISTED = {
  voices: [
    {
      id: 'peter_yearsley',
      name: 'Peter Yearsley',
      kind: 'male',
      fast: true,
      about: "Jarvis's default",
      default: true
    },
    { id: 'george', name: 'George', kind: 'male', fast: true, about: '', default: false },
    { id: 'vera', name: 'Vera', kind: 'female', fast: true, about: '', default: false },
    {
      id: 'af_heart',
      name: 'Heart (Kokoro)',
      kind: 'female',
      fast: false,
      about: 'warm',
      default: false
    },
    { id: '../etc', name: 'bad' },
    'nonsense'
  ]
}

describe('parseJarvisVoices', () => {
  it('reads the desktop list and skips anything that is not a voice id', () => {
    const voices = parseJarvisVoices(LISTED)
    expect(voices.map((v) => v.id)).toEqual(['peter_yearsley', 'george', 'vera', 'af_heart'])
    expect(voices[0]).toEqual({
      id: 'peter_yearsley',
      name: 'Peter Yearsley',
      kind: 'male',
      fast: true,
      about: "Jarvis's default",
      isDefault: true
    })
  })

  it('gives nothing for an older desktop without the list', () => {
    expect(parseJarvisVoices({ detail: 'Not Found' })).toEqual([])
    expect(parseJarvisVoices(null)).toEqual([])
  })
})

describe('chosenVoice', () => {
  const voices = parseJarvisVoices(LISTED)

  it('finds a voice by id', () => {
    expect(chosenVoice('vera', voices)?.name).toBe('Vera')
  })

  it('reads the old male and female choices as the first voice of that kind, as the desktop does', () => {
    expect(chosenVoice('male', voices)?.id).toBe('peter_yearsley')
    expect(chosenVoice('female', voices)?.id).toBe('vera')
    expect(chosenVoice('female', FALLBACK_VOICES)?.name).toBe('Female')
  })

  it('is null for a voice the desktop does not list', () => {
    expect(chosenVoice('nobody', voices)).toBeNull()
  })
})

describe('voiceDetail', () => {
  it('says fast or Kokoro, then male or female, then what it is', () => {
    const voices = parseJarvisVoices(LISTED)
    expect(voiceDetail(voices[1])).toBe('Fast · male')
    expect(voiceDetail(voices[3])).toBe('Kokoro · female · warm')
  })
})
