import type { ReactNode } from 'react'

/** One screen's claim on the strip; each screen holds its own. */
export type SideRailOwner = symbol

type RailContent = { owner: SideRailOwner; node: ReactNode }

// What the side strip shows: one screen's controls, plus an app-wide control (Jarvis). The pinned control
// sits above the strip only while no screen has controls there; a screen's controls start with it instead.
export function createRailStore() {
  let content: RailContent | null = null
  let pinned: ReactNode | null = null
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    read: () => content,
    readPinned: () => pinned,
    readTop: () => (content ? null : pinned),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    show: (owner: SideRailOwner, node: ReactNode) => {
      content = { owner, node }
      notify()
    },
    // Only the screen that showed it takes it down, so a screen leaving never hides its successor's.
    hide: (owner: SideRailOwner) => {
      if (content?.owner === owner) {
        content = null
        notify()
      }
    },
    pin: (node: ReactNode | null) => {
      pinned = node
      notify()
    }
  }
}
