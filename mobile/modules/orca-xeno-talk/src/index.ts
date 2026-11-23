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
  /** A button on the call's Live Activity: "talk" or "end". */
  onCallAction: (note: { readonly action: string }) => void
  /** An agent tapped in the Agents widget: its worktree. */
  onOpenAgent: (note: { readonly worktree: string }) => void
}

declare class OrcaXenoTalkModule extends NativeModule<XenoTalkEvents> {
  /** A press that came before JS was listening, as when it launched the app; taking it clears it. */
  takePending(): boolean
  /** What the last Talk to Xeno press found, for Xeno's server log; taking it clears it. */
  takeTrace?(): string | null
  /** An agent tapped in the Agents widget before JS was listening; taking it clears it. */
  takeOpenAgent?(): string | null
  /** Stops the call's audio so the phone's dictation can have the microphone; false if it couldn't. */
  pauseCallAudio?(): boolean
  /** Starts the call's audio again after dictation; activate is false when the call is ending anyway. */
  resumeCallAudio?(activate: boolean): boolean
  /** For the Talk to Xeno shortcut: whether a call is live (it then toggles talking without opening the app). */
  setTalkState?(live: boolean, holding: boolean): void
  /** Before a call: music from other apps keeps playing through it (and headphones stay in music quality). */
  setMusicMixing?(on: boolean): boolean
  /** Turns music from other apps down under Xeno, or back up; false if iOS wouldn't. */
  duckMusic?(on: boolean): boolean
  /** Where Xeno's widgets fetch the glance and the key to get in (JSON); they reload if it changed. */
  shareWidgetAccess?(json: string): boolean
  /** Asks the widgets to fetch again (iOS decides when). */
  reloadWidgets?(): void
  /** The call's Live Activity: started, updated, or (phase null) ended. */
  setCallActivity?(phase: string | null, heard: string, holding: boolean, host: string): void
}

/** Null on Android, the web and in a binary built before the module existed. */
export const OrcaXenoTalk = requireOptionalNativeModule<OrcaXenoTalkModule>('OrcaXenoTalk')
