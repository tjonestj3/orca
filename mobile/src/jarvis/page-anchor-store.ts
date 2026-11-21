import { useSyncExternalStore } from 'react'
import type { PageAnchor, PageAnchorName } from './page-anchors'

/** The focused desktop page's anchors for Xeno's orb (page-anchors), and whether that page is coming or going. */
type Anchors = Readonly<Partial<Record<PageAnchorName, PageAnchor>>>

function createPageAnchorStore() {
  let shown: Anchors = {}
  let owner: string | null = null
  let leaving = false
  // The page still sliding in (going back to it, or opening it). It takes focus as the slide starts, so its
  // anchors are the orb's while the screen leaving still covers it.
  let arriving: string | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  return {
    read: (): Anchors => shown,
    /** Whether a desktop page is the screen showing, whatever it has reported yet. */
    readShowing: (): boolean => owner !== null,
    /** Whether the page showing has started to go (a back swipe), with the screen under it sliding in; or is
     * still sliding in itself. Either way the orb waits, rather than show over the other screen. */
    readLeaving: (): boolean => owner !== null && (leaving || arriving === owner),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** The focused page's anchors, replacing whatever another page showed. */
    show(page: string, anchors: Anchors): void {
      if (owner !== page) {
        leaving = false
      }
      owner = page
      shown = anchors
      notify()
    },
    leave(page: string, on: boolean): void {
      if (owner === page && leaving !== on) {
        leaving = on
        notify()
      }
    },
    /** A page starts to slide in (on), or is all the way in (off). */
    arrive(page: string, on: boolean): void {
      const next = on ? page : arriving === page ? null : arriving
      if (next !== arriving) {
        arriving = next
        notify()
      }
    },
    forget(page: string): void {
      if (arriving === page) {
        arriving = null
      }
      if (owner === page) {
        owner = null
        leaving = false
        shown = {}
        notify()
      }
    }
  }
}

export const pageAnchors = createPageAnchorStore()

/**
 * Whether a desktop page is showing. Until it reports where the orb goes, the orb waits rather than show in the
 * corner and jump: opening a workspace, the page slides in a moment before it can say.
 */
export function usePageShowing(): boolean {
  return useSyncExternalStore(pageAnchors.subscribe, pageAnchors.readShowing)
}

/** Whether the desktop page showing has started to go: the orb goes with it, not over the screen coming in. */
export function usePageLeaving(): boolean {
  return useSyncExternalStore(pageAnchors.subscribe, pageAnchors.readLeaving)
}

/** The focused desktop page's anchors for Xeno's orb. */
export function usePageAnchors(): Anchors {
  return useSyncExternalStore(pageAnchors.subscribe, pageAnchors.read)
}
