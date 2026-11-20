/**
 * Xeno's orb riding with the keyboard. The orb sits by a control on the desktop's page (the composer's mic), placed
 * where the page last said that control was. The page moves the control with the keyboard at once, but says so a
 * moment later (its report can wait up to a quarter second), so the orb used to drop after the keyboard had gone.
 * The app hears of the keyboard the moment it starts to move, with its duration: the orb glides from where it is to
 * where the control will rest, on the keyboard's own curve, and the page's reports wait until the glide is done.
 * If the page then puts the control elsewhere than foreseen, the orb settles there quickly.
 *
 * The control rests on the keyboard while it's up and on the screen's bottom inset while it's down, so it moves
 * by the change in whichever of the two is higher.
 */

/** A move for the orb's top: to this many points, over this many milliseconds (0: at once). */
export type OrbMove = { readonly to: number; readonly ms: number; readonly eased: boolean }

/** How long after the keyboard's glide the page has to report where the control came to rest. */
export const RIDE_SLACK_MS = 150
/** How long the orb takes to settle where the page put the control, when that's not where it was foreseen. */
export const SETTLE_MS = 120

export function keyboardShift(from: number, to: number, bottomInset: number): number {
  return Math.max(from, bottomInset) - Math.max(to, bottomInset)
}

export class OrbKeyboardRide {
  private target: number | undefined
  private shown: number | undefined
  private keyboard: number
  private until = 0

  constructor(keyboard: number) {
    this.keyboard = keyboard
  }

  /** The page says where the orb goes (undefined: nowhere by a control). A move to make now, or null. */
  report(top: number | undefined, now: number): OrbMove | null {
    this.target = top
    if (top === undefined || now < this.until) {
      return null // the glide is under way; what the page said is taken when it ends
    }
    this.shown = top
    return { to: top, ms: 0, eased: false }
  }

  /** The keyboard starts to move to this height over this long. The glide to make, or null. */
  keyboardMoves(height: number, ms: number, bottomInset: number, now: number): OrbMove | null {
    const from = this.keyboard
    this.keyboard = height
    const at = now < this.until ? this.shown : this.target
    if (at === undefined || ms <= 0) {
      return null
    }
    const to = at + keyboardShift(from, height, bottomInset)
    this.shown = to
    this.until = now + ms + RIDE_SLACK_MS
    return { to, ms, eased: true }
  }

  /** The glide's time is up (call at its `ms` + RIDE_SLACK_MS): settling where the page put the control, or null. */
  settle(now: number): OrbMove | null {
    if (now < this.until) {
      return null // another glide began since
    }
    this.until = 0
    if (this.target === undefined || this.shown === undefined) {
      return null
    }
    const off = Math.abs(this.target - this.shown) > 1
    this.shown = this.target
    return off ? { to: this.target, ms: SETTLE_MS, eased: true } : null
  }
}
