import { requireOptionalNativeModule, type NativeModule } from 'expo-modules-core'

/** Something the phone did that can stop a call hearing the person: locking, an audio interruption. */
export type XenoDeviceNote = {
  readonly kind: string
  /** When it happened on the phone (ms since the epoch); a suspended app hands notes over late. */
  readonly at: number
  readonly [detail: string]: unknown
}

type XenoTalkEvents = {
  /** The Talk to Xeno App Intent ran: the Action Button, a Shortcut or Siri. */
  onTalk: () => void
  onDevice: (note: XenoDeviceNote) => void
}

declare class OrcaXenoTalkModule extends NativeModule<XenoTalkEvents> {
  /** A press that came before JS was listening, as when it launched the app; taking it clears it. */
  takePending(): boolean
}

/** Null on Android, the web and in a binary built before the module existed. */
export const OrcaXenoTalk = requireOptionalNativeModule<OrcaXenoTalkModule>('OrcaXenoTalk')
