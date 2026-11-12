import { requireOptionalNativeModule, type NativeModule } from 'expo-modules-core'

type XenoTalkEvents = {
  /** The Talk to Xeno App Intent ran: the Action Button, a Shortcut or Siri. */
  onTalk: () => void
}

declare class OrcaXenoTalkModule extends NativeModule<XenoTalkEvents> {
  /** A press that came before JS was listening, as when it launched the app; taking it clears it. */
  takePending(): boolean
}

/** Null on Android, the web and in a binary built before the module existed. */
export const OrcaXenoTalk = requireOptionalNativeModule<OrcaXenoTalkModule>('OrcaXenoTalk')
