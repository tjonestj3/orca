// The rail orb fills the side strip on its own; among a worktree's shortcut keys it is key-sized.
const RAIL_KEY_SIZE = 40
const RAIL_ORB_INSET = 12

export function railOrbSize(stripWidth: number, besideKeys: boolean): number {
  return besideKeys ? RAIL_KEY_SIZE : stripWidth - RAIL_ORB_INSET * 2
}

// A press shorter than this opens the Jarvis screen instead of talking.
export const TAP_MAX_MS = 250

export function classifyBubbleRelease(heldMs: number): 'tap' | 'talk' {
  return heldMs < TAP_MAX_MS ? 'tap' : 'talk'
}

// The floating bubble: never over the Jarvis screen or the Xeno chat, which have their own, on Home, whose tab bar
// holds Xeno, or when the folded Duo's rail holds Jarvis; otherwise always during a call, and before one once the
// computer's Jarvis has answered.
export function bubbleVisible(s: {
  live: boolean
  reachable: boolean | null
  onJarvisScreen: boolean
  onXenoChat: boolean
  onHome: boolean
  railAvailable: boolean
}): boolean {
  if (s.onJarvisScreen || s.onXenoChat || s.onHome || s.railAvailable) {
    return false
  }
  return s.live || s.reachable === true
}

// A press on the bubble or rail orb. In a live call the mic opens at once; with no call, the call starts only
// once the press has outlasted a tap, so a tap just opens the Jarvis screen.
export function bubblePress(actions: {
  live: () => boolean
  pressTalk: () => void
  releaseTalk: () => void
  cancelTalk: () => void
  openScreen: () => void
}): { pressIn: () => void; pressOut: () => void; unmount: () => void } {
  let pressedAt = 0
  let talking = false
  let pending: ReturnType<typeof setTimeout> | null = null
  const talk = (): void => {
    talking = true
    actions.pressTalk()
  }
  const clearPending = (): boolean => {
    if (!pending) {
      return false
    }
    clearTimeout(pending)
    pending = null
    return true
  }
  return {
    pressIn: () => {
      pressedAt = Date.now()
      if (actions.live()) {
        talk()
      } else {
        pending = setTimeout(() => {
          pending = null
          talk()
        }, TAP_MAX_MS)
      }
    },
    pressOut: () => {
      if (clearPending()) {
        actions.openScreen()
        return
      }
      talking = false
      if (classifyBubbleRelease(Date.now() - pressedAt) === 'talk') {
        actions.releaseTalk()
      } else {
        actions.cancelTalk()
        actions.openScreen()
      }
    },
    // Folding or unfolding the Duo moves Jarvis between bubble and rail mid-hold: that counts as letting go.
    unmount: () => {
      clearPending()
      if (talking) {
        talking = false
        actions.releaseTalk()
      }
    }
  }
}

// The folded Duo's rail orb: for a known computer, on every screen but the Jarvis screen, which has its own, and
// Home, whose tab bar holds Xeno.
export function railOrbVisible(s: {
  hasStrip: boolean
  hasHost: boolean
  onJarvisScreen: boolean
  onHome: boolean
}): boolean {
  return s.hasStrip && s.hasHost && !s.onJarvisScreen && !s.onHome
}

// Xeno in Home's tab bar: once there's a computer to talk to (one answering, a call on, or several to pick from).
export function xenoTabVisible(s: {
  live: boolean
  reachable: boolean | null
  canPick: boolean
}): boolean {
  return s.live || s.reachable === true || s.canPick
}

// The Action Button (or "Talk to Xeno" in Shortcuts and Siri): a press starts talking, the next one sends, like
// holding the bubble and letting go. With several desktops and none picked yet, it asks which first.
export function actionButtonPress(s: {
  holding: boolean
  canPick: boolean
  canTalk: boolean
}): 'press' | 'release' | 'pick' | null {
  if (s.holding) {
    return 'release'
  }
  if (s.canPick) {
    return 'pick'
  }
  return s.canTalk ? 'press' : null
}

/** The small Xeno orb in a session, beside the controls Orca's page draws (measured on the iPhone Duo). */
const SESSION_ORB = 28
// Chat: the composer's bottom row sits 8 pt above the home inset (or the keyboard), its mic centred 33 pt up from
// there and 91 pt in from the right; the orb goes just left of the mic.
const COMPOSER_GAP = 8
const COMPOSER_ROW_CENTRE = 33
const CHAT_ORB_RIGHT = 115
// Terminal: Claude Code's status line, the terminal's last, ends 127 pt above the home inset, over the keys and
// the input row; the orb ends it.
const TERMINAL_ORB_BOTTOM = 113
const TERMINAL_ORB_RIGHT = 8

export function sessionOrbPlace(s: {
  view: 'chat' | 'terminal'
  insetsBottom: number
  /** How much of the screen's bottom the keyboard covers; 0 while it's down. */
  keyboard: number
  /** Where the screen's content ends on the right: a side inset, or 0 over the folded Duo's column. */
  rightEdge: number
}): { bottom: number; right: number; size: number } {
  const floor = s.keyboard > 0 ? s.keyboard : s.insetsBottom
  const bottom =
    s.view === 'chat'
      ? floor + COMPOSER_GAP + COMPOSER_ROW_CENTRE - SESSION_ORB / 2
      : floor + TERMINAL_ORB_BOTTOM
  const right = s.rightEdge + (s.view === 'chat' ? CHAT_ORB_RIGHT : TERMINAL_ORB_RIGHT)
  return { bottom, right, size: SESSION_ORB }
}

/** A desktop's name as initials, for the small labels beside the orb: "Xeno Laptop" is "XL", "pop-os" "PO". */
export function hostInitials(name: string): string {
  const words = name.split(/[\s._-]+/).filter((word) => /[\p{L}\p{N}]/u.test(word))
  if (words.length === 0) {
    return name.trim()
  }
  return words
    .slice(0, 3)
    .map((word) => Array.from(word.replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? '')
    .join('')
    .toUpperCase()
}
