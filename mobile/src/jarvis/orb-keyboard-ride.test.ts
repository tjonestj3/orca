import { describe, expect, it } from 'vitest'
import { keyboardShift, OrbKeyboardRide, orbTop, RIDE_SLACK_MS } from './orb-keyboard-ride'

const INSET = 34 // the home indicator's
const KEYBOARD = 336

describe('the orb riding with the keyboard', () => {
  it('moves by what the control rests on: the keyboard while it’s up, the bottom inset while it’s down', () => {
    expect(keyboardShift(KEYBOARD, 0, INSET)).toBe(KEYBOARD - INSET) // down as the keyboard goes
    expect(keyboardShift(0, KEYBOARD, INSET)).toBe(INSET - KEYBOARD) // up as it comes
    expect(keyboardShift(0, 0, INSET)).toBe(0)
  })

  it('follows the keyboard frame by frame, from where the page last put the control', () => {
    const base = { top: 400, keyboard: KEYBOARD } // the mic over the open keyboard
    // The keyboard's own positions as it drops: the orb is exactly that far down, every frame.
    expect(orbTop(base, KEYBOARD, INSET)).toBe(400)
    expect(orbTop(base, 200, INSET)).toBe(400 + 136)
    expect(orbTop(base, 50, INSET)).toBe(400 + 286)
    expect(orbTop(base, 0, INSET)).toBe(400 + KEYBOARD - INSET) // where the mic rests with it gone
    // Under the bottom inset the control doesn't move any more, so neither does the orb.
    expect(orbTop(base, 20, INSET)).toBe(orbTop(base, 0, INSET))
  })

  it('takes the page’s word at once while the keyboard is still, with the keyboard it was laid out over', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    expect(ride.report(400, 0)).toEqual({ top: 400, keyboard: KEYBOARD })
    expect(ride.report(undefined, 10)).toBeNull()
  })

  it('holds the page’s word while the keyboard moves, then takes the last one', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    ride.report(400, 0)
    ride.keyboardMoves(0, 250, 1000) // the down arrow
    // Mid-move the page says where the mic went: it waits, or it'd be read against the wrong keyboard.
    expect(ride.report(702, 1100)).toBeNull()
    expect(ride.settle(1000 + 250 + RIDE_SLACK_MS - 1)).toBeNull()
    const settled = ride.settle(1000 + 250 + RIDE_SLACK_MS)
    expect(settled).toEqual({ top: 702, keyboard: 0 })
    // Where the keyboard left the orb and where the page put the mic agree: no jump at the hand-over.
    expect(orbTop(settled!, 0, INSET)).toBe(orbTop({ top: 400, keyboard: KEYBOARD }, 0, INSET))
    expect(ride.report(500, 2000)).toEqual({ top: 500, keyboard: 0 }) // and after, at once again
  })

  it('a second move before the first is done keeps the page’s word waiting until the last one ends', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    ride.report(400, 0)
    ride.keyboardMoves(0, 250, 1000)
    ride.keyboardMoves(KEYBOARD, 250, 1100) // the keyboard comes back up
    expect(ride.settle(1000 + 250 + RIDE_SLACK_MS)).toBeNull() // the first move's timer: superseded
    expect(ride.settle(1100 + 250 + RIDE_SLACK_MS)).toEqual({ top: 400, keyboard: KEYBOARD })
  })

  it('a keyboard change with no move (no duration) doesn’t hold the page’s word', () => {
    const ride = new OrbKeyboardRide(0)
    ride.keyboardMoves(KEYBOARD, 0, 10)
    expect(ride.report(400, 20)).toEqual({ top: 400, keyboard: KEYBOARD })
  })
})
