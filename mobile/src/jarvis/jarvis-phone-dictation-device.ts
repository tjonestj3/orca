import {
  addExpoTwoWayAudioEventListener,
  initialize,
  preferSpeakerForCallIOS,
  speechAvailability,
  speechCancel,
  speechFeed,
  speechFinish,
  speechStart,
  tearDown,
  toggleRecording
} from '@orca/expo-two-way-audio'
import { OrcaXenoTalk } from '../../modules/orca-xeno-talk/src'
import { NATIVE_AUDIO_DEVICE_SAMPLE_RATE } from '../platform/native-audio-device'
import { PhoneDictation, type PhoneDictationDevice } from './jarvis-phone-dictation'

// Xeno speaks English (the desktop's Whisper is English-only too).
const LOCALE = 'en-US'

const device: PhoneDictationDevice = {
  available: async () =>
    Boolean(OrcaXenoTalk?.pauseCallAudio) && (await speechAvailability(LOCALE)).status === 'ready',
  pauseCall: () => OrcaXenoTalk?.pauseCallAudio?.() === true,
  resumeCall: (activate) => {
    OrcaXenoTalk?.resumeCallAudio?.(activate)
    if (activate) {
      preferSpeakerForCallIOS(true) // as when the call connected; the dictation engine reconfigured the session
    }
  },
  openMic: () => initialize(),
  record: (on) => toggleRecording(on),
  closeMic: () => tearDown(),
  onPcm: (handler) => {
    const subscription = addExpoTwoWayAudioEventListener('onMicrophoneData', (event) => {
      const raw = event.data
      handler(raw instanceof Uint8Array ? raw : new Uint8Array(raw))
    })
    return () => subscription.remove()
  },
  feed: (pcm) => speechFeed(pcm),
  start: async () => (await speechStart(LOCALE, NATIVE_AUDIO_DEVICE_SAMPLE_RATE)).started,
  finish: () => speechFinish(),
  cancel: () => speechCancel(),
  onText: (handler) => {
    const subscription = addExpoTwoWayAudioEventListener('onSpeechText', (event) =>
      handler(`${event.committed}${event.tentative}`.trim())
    )
    return () => subscription.remove()
  }
}

// One per app: the phone has one recognizer and one microphone.
export const phoneDictation = new PhoneDictation(device)
