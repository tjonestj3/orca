import type { RTCPeerConnection } from 'react-native-webrtc'
import type { JarvisVoice } from './jarvis-voice-preference'

// Connecting a Jarvis call: the HTTP offer/answer exchange and waiting for ICE candidates.
const OFFER_TIMEOUT_MS = 10_000
const ICE_GATHER_TIMEOUT_MS = 2_500

// WebRTC's audioLevel is linear amplitude; the square root reads closer to how loud speech sounds.
export function loudness(audioLevel: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, audioLevel)) * 1.6)
}

export function iceGathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const done = (): void => {
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = (): void => {
      if (pc.iceGatheringState === 'complete') {
        done()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
    setTimeout(done, ICE_GATHER_TIMEOUT_MS)
  })
}

export async function postOffer(
  url: string,
  offer: {
    sdp?: string
    type?: string | null
    request_data: { voice: JarvisVoice; ask?: string }
  }
): Promise<{ sdp: string; type: 'answer' }> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), OFFER_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
      signal: abort.signal
    })
    if (!response.ok) {
      throw new Error(`Jarvis answered ${response.status}`)
    }
    return (await response.json()) as { sdp: string; type: 'answer' }
  } finally {
    clearTimeout(timer)
  }
}

type AudioStat = { type?: string; kind?: string; audioLevel?: number }

// How loud each side is right now, from the call's WebRTC stats: what's received (Jarvis) and what's sent (you).
export function audioLevelsFromStats(report: Map<string, AudioStat>): {
  user: number
  bot: number
} {
  let user = 0
  let bot = 0
  report.forEach((stat) => {
    if (stat.kind !== 'audio' || typeof stat.audioLevel !== 'number') {
      return
    }
    if (stat.type === 'inbound-rtp') {
      bot = loudness(stat.audioLevel)
    } else if (stat.type === 'media-source') {
      user = loudness(stat.audioLevel)
    }
  })
  return { user, bot }
}
