import { useSyncExternalStore } from 'react'

/**
 * Whether Orca's session page has a sheet or menu open. Xeno's small orb is drawn by the app over the page, so the
 * page's own sheets can't cover it; it steps aside while one is open instead. The page is React Native Web, which
 * marks every open Modal `aria-modal="true"`; a script run in the page (with the theme's) watches for one and posts
 * the change over the page's bridge as its own small message, which the shell reads before Orca's bridge does.
 */
export const PAGE_MODAL_MESSAGE = 'xeno-page-modal'

// Plain source, run in the page as each page loads. It reposts the current state each time it's run.
export const PAGE_MODAL_WATCH = String.raw`(function () {
var state = window.__xenoModalWatch || (window.__xenoModalWatch = {});
function check() {
  state.pending = false;
  var open = document.querySelector('[aria-modal="true"]') !== null;
  if (open === state.open) return;
  state.open = open;
  try { window.orcaBridge.postMessage(JSON.stringify({ type: '${PAGE_MODAL_MESSAGE}', open: open })); } catch (e) {}
}
if (!state.installed) {
  state.installed = true;
  new MutationObserver(function () {
    if (!state.pending) { state.pending = true; requestAnimationFrame(check); }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal'] });
}
state.open = undefined;
check();
})();`

/** The open state a page message carries, or null when it's not this message (Orca's own, for its bridge). */
export function readPageModalMessage(json: string): boolean | null {
  if (!json.includes(PAGE_MODAL_MESSAGE)) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    parsed.type !== PAGE_MODAL_MESSAGE ||
    !('open' in parsed) ||
    typeof parsed.open !== 'boolean'
  ) {
    return null
  }
  return parsed.open
}

export function createPageModalStore() {
  const open = new Set<string>()
  const listeners = new Set<() => void>()
  const set = (page: string, isOpen: boolean): void => {
    if (open.has(page) === isOpen) {
      return
    }
    if (isOpen) {
      open.add(page)
    } else {
      open.delete(page)
    }
    listeners.forEach((listener) => listener())
  }
  return {
    read: (): boolean => open.size > 0,
    readFor: (page: string | null): boolean => page !== null && open.has(page),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set,
    /** A page that's gone (unmounted, or a new session in its place) has nothing open. */
    forget: (page: string): void => set(page, false)
  }
}

export const pageModals = createPageModalStore()

/** Whether any session page on screen has a sheet or menu open. */
export function usePageModalOpen(): boolean {
  return useSyncExternalStore(pageModals.subscribe, pageModals.read)
}

/** Whether this page has a sheet or menu open. */
export function usePageModalOpenFor(page: string | null): boolean {
  return useSyncExternalStore(pageModals.subscribe, () => pageModals.readFor(page))
}
