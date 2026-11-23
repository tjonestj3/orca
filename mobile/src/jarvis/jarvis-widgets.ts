import type { JarvisPhase, JarvisWorktreeCard } from './jarvis-call-state'
import { jarvisGlanceUrl } from './jarvis-endpoint'

// What the app hands Xeno's widgets (targets/XenoWidgets): where to fetch the desktop's glance and the key to get
// in, and the call's Live Activity as the call goes.

const HEARD_CHARS = 120

/** The call's Live Activity: phase null ends it (no call). */
export type CallActivity = {
  readonly phase: Exclude<JarvisPhase, 'idle' | 'error'> | null
  readonly heard: string
  readonly holding: boolean
  readonly host: string
}

export function callActivity(s: {
  readonly phase: JarvisPhase
  readonly heard: string
  readonly holding: boolean
  readonly host: string | null
}): CallActivity {
  const live = s.phase !== 'idle' && s.phase !== 'error'
  const heard = s.heard.trim()
  return {
    phase: live ? s.phase : null,
    // The end of what was said: the lock screen shows two lines.
    heard: live && heard.length > HEARD_CHARS ? `…${heard.slice(-HEARD_CHARS + 1).trimStart()}` : live ? heard : '',
    holding: live && s.holding,
    host: s.host ?? 'Desktop'
  }
}

/** The widgets' access as the native module keeps it, or null without a desktop to point them at. */
export function widgetAccess(
  endpoint: string | null,
  key: string | undefined,
  host: string | null
): string | null {
  const glance = endpoint ? jarvisGlanceUrl(endpoint) : null
  if (!glance) {
    return null
  }
  return JSON.stringify({ glance, key: key ?? '', host: host ?? 'Desktop' })
}

/** A Live Activity button: "talk" presses talk (or sends, while held), "end" hangs up. */
export function callActionOf(note: unknown): 'talk' | 'end' | null {
  const action = (note as { action?: unknown } | null)?.action
  return action === 'talk' || action === 'end' ? action : null
}

/** An agent tapped in the Agents widget: its worktree, or null. */
export function agentOf(note: unknown): string | null {
  const worktree = (note as { worktree?: unknown } | null)?.worktree
  return typeof worktree === 'string' && worktree !== '' ? worktree : null
}

/** Each agent's state, as one string that changes only when one does (a new line or artifact doesn't count). */
export function agentStates(cards: readonly Pick<JarvisWorktreeCard, 'id' | 'state'>[]): string {
  return cards
    .map((card) => `${card.id}=${card.state}`)
    .sort()
    .join('\n')
}
