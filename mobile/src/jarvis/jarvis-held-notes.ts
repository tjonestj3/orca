/** A device note for Xeno's server log (jarvis-device): what it was, when on the phone, and its details. */
export type DeviceNote = { readonly kind: string; readonly at: number; readonly [detail: string]: unknown }

const KEEP = 8
// Older than this, a note says nothing about the call that's starting.
const MAX_AGE_MS = 2 * 60_000

/**
 * Notes made while no call could send them, sent as the next one connects: a Talk to Xeno press that launches the
 * app is noted before its call exists, so the server never saw what a shortcut launch found (Nov 21).
 */
export class HeldNotes {
  private notes: DeviceNote[] = []

  keep(note: DeviceNote): void {
    this.notes.push(note)
    if (this.notes.length > KEEP) {
      this.notes.shift()
    }
  }

  /** The notes kept, still recent at `now`; each is given once. */
  take(now: number): DeviceNote[] {
    const recent = this.notes.filter((note) => now - note.at <= MAX_AGE_MS)
    this.notes = []
    return recent
  }
}
