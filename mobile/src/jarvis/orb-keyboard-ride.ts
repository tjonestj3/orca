/**
 * Xeno's orb riding with the keyboard. The orb sits by a control on the desktop's page (the composer's mic), placed
 * where the page last said that control was. The page's word that the control moved can come up to a quarter
 * second late, so the orb used to drop after the keyboard had gone; a glide of its own, started when the app heard
 * of the keyboard, still trailed it a little (Nov 20).
 *
 * So the orb's place is worked out every frame from the keyboard's own position (useAnimatedKeyboard, on the UI
 * thread): where the page last put the control, shifted by how far the keyboard has moved since. The control
 * rests on the keyboard while it's up and on the screen's bottom inset while it's down, so it moves by the change
 * in whichever of the two is higher. That's the keyboard's own frames, its curve and its start, not a copy.
 *
 * While the keyboard moves, the page's reports wait (one measured mid-move would be read against the wrong
 * keyboard height); when it's done, the orb takes the last one, easing there if the control came to rest a little
 * elsewhere than foreseen.
 */

/** Where the orb goes: the page's `top` for the control, as laid out over a keyboard `keyboard` points high. */
export type OrbBase = { readonly top: number; readonly keyboard: number }

/** How long after the keyboard's move the page has to report where the control came to rest. */
export const RIDE_SLACK_MS = 150
/** How long the orb takes to settle where the page put the control, when that's not where it was foreseen. */
export const SETTLE_MS = 120

export function keyboardShift(from: number, to: number, bottomInset: number): number {
  return Math.max(from, bottomInset) - Math.max(to, bottomInset)
}

/** The orb's top over a keyboard `keyboard` points high, from its base. Also run per frame on the UI thread. */
export function orbTop(base: OrbBase, keyboard: number, bottomInset: number): number {
  'worklet'
  return base.top + Math.max(base.keyboard, bottomInset) - Math.max(keyboard, bottomInset)
}

export class OrbKeyboardRide {
  private target: number | undefined
  private keyboard: number
  private until = 0

  constructor(keyboard: number) {
    this.keyboard = keyboard
  }

  /** The page says where the orb goes (undefined: nowhere by a control). The base to take now, or null. */
  report(top: number | undefined, now: number): OrbBase | null {
    this.target = top
    if (top === undefined || now < this.until) {
      return null // the keyboard is moving; what the page said is taken when it's done
    }
    return { top, keyboard: this.keyboard }
  }

  /** The keyboard starts to move to this height over this long: the page's reports wait until it's done. */
  keyboardMoves(height: number, ms: number, now: number): void {
    this.keyboard = height
    if (ms > 0) {
      this.until = Math.max(this.until, now + ms + RIDE_SLACK_MS)
    }
  }

  /** The keyboard's move is done (call at its `ms` + RIDE_SLACK_MS): the base to take, or null. */
  settle(now: number): OrbBase | null {
    if (now < this.until) {
      return null // another move began since
    }
    this.until = 0
    return this.target === undefined ? null : { top: this.target, keyboard: this.keyboard }
  }
}
