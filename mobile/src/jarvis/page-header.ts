import { useSyncExternalStore } from 'react'

/**
 * The header of a desktop page that isn't a session (the host's workspace list), on the folded Duo in full screen.
 * Its header keeps below the top inset only, so instead of pushing it down the camera's height the shell has it
 * clear the column on its right (the camera tops it) plus room for Xeno's orb, and places the orb there, beside
 * the header's "More actions" button, which the page reports. Found by that button's label (as the app's own
 * translation gives it, the page sharing its language) near the top of the page.
 */
export const PAGE_HEADER_MESSAGE = 'xeno-page-header'

/** Xeno's orb in the header and the gaps either side of it. */
export const HEADER_ORB = 32
export const HEADER_ORB_GAP = 6

export type PageHeaderButton = { x: number; y: number; width: number; height: number }

// How far down the page the header's button can be: it's in the top bar, under the top inset at most.
const HEADER_REACH = 140

/**
 * The script for the page: pad the bar holding the button by `pad` more on the right (none puts it back), and
 * report where the button is, or that there isn't one. Run again whenever either changes.
 */
export function pageHeaderScript(label: string | null, pad: number): string {
  return String.raw`(function () {
var state = window.__xenoHeader || (window.__xenoHeader = {});
state.label = ${JSON.stringify(label)};
state.pad = ${JSON.stringify(pad)};
function bar(button) {
  var el = button.parentElement;
  while (el && el.getBoundingClientRect().width < window.innerWidth - 2) el = el.parentElement;
  return el;
}
function find() {
  if (!state.label) return null;
  var found = null;
  document.querySelectorAll('[aria-label]').forEach(function (el) {
    if (found || el.getAttribute('aria-label') !== state.label) return;
    var r = el.getBoundingClientRect();
    if (r.width > 0 && r.top >= 0 && r.top < ${HEADER_REACH}) found = el;
  });
  return found;
}
function check() {
  state.pending = false;
  var button = find();
  var row = button ? bar(button) : null;
  if (state.row && state.row !== row) { state.row.style.removeProperty('padding-right'); state.row = null; }
  if (row) {
    if (state.row !== row) { state.row = row; state.base = parseFloat(getComputedStyle(row).paddingRight) || 0; }
    if (state.pad > 0) row.style.setProperty('padding-right', (state.base + state.pad) + 'px', 'important');
    else row.style.removeProperty('padding-right');
  }
  var r = button && button.getBoundingClientRect();
  var at = r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',') : '';
  if (at === state.at) return;
  state.at = at;
  try {
    window.orcaBridge.postMessage(JSON.stringify({ type: '${PAGE_HEADER_MESSAGE}', at: at }));
  } catch (e) {}
}
function soon() { if (!state.pending) { state.pending = true; requestAnimationFrame(check); } }
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('resize', soon);
}
state.at = undefined;
check();
})();`
}

/** Where the page's header button is (`null`: none showing), or `undefined` when it's not this message. */
export function readPageHeaderMessage(json: string): PageHeaderButton | null | undefined {
  if (!json.includes(PAGE_HEADER_MESSAGE)) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return undefined
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    parsed.type !== PAGE_HEADER_MESSAGE ||
    !('at' in parsed) ||
    typeof parsed.at !== 'string'
  ) {
    return undefined
  }
  if (parsed.at === '') {
    return null
  }
  const [x, y, width, height] = parsed.at.split(',').map(Number)
  if ([x, y, width, height].some((n) => n === undefined || !Number.isFinite(n))) {
    return undefined
  }
  return { x: x ?? 0, y: y ?? 0, width: width ?? 0, height: height ?? 0 }
}

/** Where Xeno's orb goes beside the button: to its right, centred on it, in window points. */
export function headerOrbPlace(button: PageHeaderButton): {
  left: number
  top: number
  size: number
} {
  return {
    left: button.x + button.width + HEADER_ORB_GAP,
    top: button.y + (button.height - HEADER_ORB) / 2,
    size: HEADER_ORB
  }
}

function createPageHeaderStore() {
  let shown: PageHeaderButton | null = null
  let owner: string | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  return {
    read: (): PageHeaderButton | null => shown,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(page: string, button: PageHeaderButton | null): void {
      if (button === null && owner !== page) {
        return
      }
      owner = button === null ? null : page
      shown = button
      notify()
    },
    forget(page: string): void {
      if (owner === page) {
        owner = null
        shown = null
        notify()
      }
    }
  }
}

export const pageHeaders = createPageHeaderStore()

/** The focused desktop page's header button, if it has one Xeno's orb goes beside. */
export function usePageHeaderButton(): PageHeaderButton | null {
  return useSyncExternalStore(pageHeaders.subscribe, pageHeaders.read)
}
