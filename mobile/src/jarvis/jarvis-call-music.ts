import { Platform } from 'react-native'
import { mediaDevices, type MediaStream } from 'react-native-webrtc'
import { requestMicrophonePermissionsAsync } from '@orca/expo-two-way-audio'
import { OrcaXenoTalk } from '../../modules/orca-xeno-talk/src'
import type { JarvisCallSnapshot } from './jarvis-call-types'
import { MusicDucker, musicUnderXeno } from './jarvis-music'

/** One call's music from other apps: mixed in when chosen on the Xeno screen, and turned down under Xeno. */
export class CallMusic {
  private readonly ducker = new MusicDucker((on) => OrcaXenoTalk?.duckMusic?.(on))
  /** Whether this call mixes with other apps' audio; set before the microphone opens. */
  mixing = false

  /** Before the microphone opens, which is when WebRTC sets the call's audio up. */
  prepare(): void {
    const wanted = Platform.OS === 'ios' && musicUnderXeno.read()
    this.mixing = OrcaXenoTalk?.setMusicMixing?.(wanted) === true && wanted
  }

  /** For Xeno's server log, once the call is up: whether music plays on through it. */
  note(): { kind: string; on: boolean } {
    return { kind: 'music-mixing', on: this.mixing }
  }

  follow(call: JarvisCallSnapshot): void {
    if (this.mixing) {
      this.ducker.follow(call)
    }
  }

  stop(): void {
    this.ducker.stop()
    this.mixing = false
  }
}

/**
 * The call's microphone, once allowed: null when it isn't, or won't open. The music choice is set just before,
 * since opening it is when WebRTC sets the call's audio up.
 */
export async function openCallMicrophone(music: CallMusic): Promise<MediaStream | null> {
  const permission = await requestMicrophonePermissionsAsync().catch(() => null)
  if (!permission?.granted) {
    return null
  }
  music.prepare()
  try {
    return await mediaDevices.getUserMedia({ audio: true, video: false })
  } catch {
    return null
  }
}
