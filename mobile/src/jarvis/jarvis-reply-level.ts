// How loud Xeno's voice arrives at the phone over one reply, before iOS plays it: the start of the reply against
// its end. Sent to the desktop's log, to tell whether a reply that sounds like it fades already arrives quieter
// (the desktop's side) or arrives steady and gets quieter in the phone's own audio processing.

const SPEAKING = 0.15 // the orb's bot level above which Xeno is talking
const ENDED_MS = 1500 // this long quiet, and the reply is over (sentences have shorter pauses)
const MIN_REPLY_MS = 3000 // shorter replies say nothing about fading
const EDGE_MS = 2000 // how much of each end is averaged
const GAP_MS = 2000 // readings stopped this long (the call ended): start afresh

export type ReplyLevel = {
  readonly seconds: number
  readonly startDb: number
  readonly endDb: number
}

// The orb's level is loudness(audioLevel) = 1.6 * sqrt(audioLevel); this undoes it, as dB of what arrived.
export function botLevelDb(level: number): number {
  const amplitude = (level / 1.6) ** 2
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -100
}

function averageDb(levels: readonly number[]): number {
  return levels.reduce((sum, db) => sum + db, 0) / levels.length
}

export class ReplyLevelTracker {
  private startedAt: number | null = null
  private lastLoudAt = 0
  private samples: { at: number; db: number }[] = []
  private lastFeedAt = 0

  // One reading of the bot's level; a summary once a long enough reply has ended.
  feed(level: number, now: number): ReplyLevel | null {
    if (now - this.lastFeedAt > GAP_MS) {
      this.startedAt = null
      this.samples = []
    }
    this.lastFeedAt = now
    if (level > SPEAKING) {
      this.startedAt ??= now
      this.lastLoudAt = now
      this.samples.push({ at: now, db: botLevelDb(level) })
      return null
    }
    if (this.startedAt === null || now - this.lastLoudAt < ENDED_MS) {
      return null
    }
    const start = this.startedAt
    const end = this.lastLoudAt
    const samples = this.samples
    this.startedAt = null
    this.samples = []
    if (end - start < MIN_REPLY_MS) {
      return null
    }
    return {
      seconds: Math.round((end - start) / 100) / 10,
      startDb: averageDb(samples.filter((s) => s.at < start + EDGE_MS).map((s) => s.db)),
      endDb: averageDb(samples.filter((s) => s.at > end - EDGE_MS).map((s) => s.db))
    }
  }
}
