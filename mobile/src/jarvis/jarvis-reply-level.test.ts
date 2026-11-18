import { describe, expect, it } from 'vitest'
import { ReplyLevelTracker, botLevelDb } from './jarvis-reply-level'

// Feeds a level every 100 ms, the call's poll rate, from `from` ms for `ms` ms.
function play(tracker: ReplyLevelTracker, level: (t: number) => number, from: number, ms: number) {
  const done = []
  for (let t = from; t < from + ms; t += 100) {
    const summary = tracker.feed(level(t), t)
    if (summary) {
      done.push(summary)
    }
  }
  return done
}

describe('ReplyLevelTracker', () => {
  it('sums up a reply once it has ended: how loud its start and its end arrived', () => {
    const tracker = new ReplyLevelTracker()
    const fading = (t: number) => (t < 2000 ? 0.8 : t < 6000 ? 0.6 : 0.4)
    expect(play(tracker, fading, 0, 8000)).toEqual([])
    const [summary] = play(tracker, () => 0, 8000, 2000)
    expect(summary.seconds).toBeCloseTo(7.9, 1)
    expect(summary.startDb).toBeCloseTo(botLevelDb(0.8), 1)
    expect(summary.endDb).toBeCloseTo(botLevelDb(0.4), 1)
    expect(summary.startDb - summary.endDb).toBeGreaterThan(10)
  })

  it('takes the pauses between sentences as part of one reply, and skips short ones', () => {
    const tracker = new ReplyLevelTracker()
    const sentences = (t: number) => (t % 2000 < 1600 ? 0.7 : 0)
    expect(play(tracker, sentences, 0, 6000)).toEqual([])
    expect(play(tracker, () => 0, 6000, 2000)).toHaveLength(1)
    expect(play(tracker, () => 0.7, 9000, 1500)).toEqual([])
    // A "Yes?" is too short to say anything about.
    expect(play(tracker, () => 0, 10500, 3000)).toEqual([])
  })
})

describe('ReplyLevelTracker across calls', () => {
  it('forgets a reply a hang-up left unfinished: readings stopped, so the next call starts afresh', () => {
    const tracker = new ReplyLevelTracker()
    expect(play(tracker, () => 0.8, 0, 4000)).toEqual([])
    // The next call, a minute later: a short "Yes?" and quiet, which says nothing about the old reply.
    expect(play(tracker, () => 0.7, 60_000, 500)).toEqual([])
    expect(play(tracker, () => 0, 60_500, 3000)).toEqual([])
  })
})

describe('botLevelDb', () => {
  it('undoes the orb’s loudness curve back to decibels of what arrived', () => {
    expect(botLevelDb(1.6 * Math.sqrt(0.1))).toBeCloseTo(-20, 5)
    expect(botLevelDb(0)).toBe(-100)
  })
})
