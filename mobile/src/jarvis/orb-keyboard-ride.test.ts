import { describe, expect, it } from 'vitest'
import { keyboardShift, OrbKeyboardRide, RIDE_SLACK_MS, SETTLE_MS } from './orb-keyboard-ride'

const INSET = 34 // the home indicator's
const KEYBOARD = 336

describe('the orb riding with the keyboard', () => {
  it('moves by what the control rests on: the keyboard while it’s up, the bottom inset while it’s down', () => {
    expect(keyboardShift(KEYBOARD, 0, INSET)).toBe(KEYBOARD - INSET) // down as the keyboard goes
    expect(keyboardShift(0, KEYBOARD, INSET)).toBe(INSET - KEYBOARD) // up as it comes
    expect(keyboardShift(0, 0, INSET)).toBe(0)
  })

  it('glides down with the keyboard as it starts to go, not when the page says so a moment later', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    expect(ride.report(400, 0)).toEqual({ to: 400, ms: 0, eased: false }) // over the open keyboard
    // The down arrow: the keyboard starts to drop over 250 ms; the orb goes with it, to where the mic will rest.
    expect(ride.keyboardMoves(0, 250, INSET, 1000)).toEqual({
      to: 400 + KEYBOARD - INSET,
      ms: 250,
      eased: true
    })
    // The page's word, mid-glide: taken when the glide's done, not now (it would stop the glide short).
    expect(ride.report(400 + KEYBOARD - INSET, 1260)).toBeNull()
    // Where the page put it is where the orb went: nothing to settle.
    expect(ride.settle(1000 + 250 + RIDE_SLACK_MS)).toBeNull()
    // And the page's later words move it at once again.
    expect(ride.report(500, 2000)).toEqual({ to: 500, ms: 0, eased: false })
  })

  it('settles quickly where the page put the control, when that’s not where it was foreseen', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    ride.report(400, 0)
    ride.keyboardMoves(0, 250, INSET, 1000)
    ride.report(690, 1300) // the composer rested 12 pt off the guess
    expect(ride.settle(1000 + 250 + RIDE_SLACK_MS)).toEqual({ to: 690, ms: SETTLE_MS, eased: true })
  })

  it('turning back mid-glide (the keyboard coming up again) goes from where the orb is, not where it was told', () => {
    const ride = new OrbKeyboardRide(KEYBOARD)
    ride.report(400, 0)
    ride.keyboardMoves(0, 250, INSET, 1000)
    expect(ride.keyboardMoves(KEYBOARD, 250, INSET, 1100)).toEqual({
      to: 400,
      ms: 250,
      eased: true
    })
    expect(ride.settle(1000 + 250 + RIDE_SLACK_MS)).toBeNull() // the first glide's timer: superseded
    expect(ride.settle(1100 + 250 + RIDE_SLACK_MS)).toBeNull() // back where the page has it
  })

  it('leaves a spot the page hasn’t placed, and a keyboard change with no glide, alone', () => {
    const ride = new OrbKeyboardRide(0)
    expect(ride.keyboardMoves(KEYBOARD, 250, INSET, 0)).toBeNull() // nowhere by a control yet
    ride.report(400, 10)
    expect(ride.keyboardMoves(0, 0, INSET, 20)).toBeNull() // no duration: the page's word will do
  })
})
