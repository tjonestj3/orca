import { useSyncExternalStore } from 'react'

/**
 * Where Xeno's orb goes on a desktop page, from buttons the page itself reports, found by their labels (as the
 * app's own translation gives them; the page shares its language):
 *
 * - `header`: the host list's "More actions", near the page's top. Full screen on the folded Duo, that page's header
 *   only keeps below the top inset, so instead of pushing it down the camera's height the script pads the bar it's
 *   in clear of the column (the camera tops it) plus room for the orb, which sits beside the button.
 * - `mic`: a session composer's mic, near the page's bottom; the orb sits just left of it. A tab without a
 *   composer (a file, a browser) has none, and the orb keeps to a corner instead of floating over the page.
 */
export type PageAnchorName = 'header' | 'mic'
export type PageAnchor = { x: number; y: number; width: number; height: number }

export const PAGE_ANCHOR_MESSAGE = 'xeno-page-anchor'

/** Xeno's orb in the host list's header and the gaps either side of it. */
export const HEADER_ORB = 32
export const HEADER_ORB_GAP = 6
const MIC_ORB_GAP = 8

export type PageAnchorWatch = {
  readonly name: PageAnchorName
  readonly labels: readonly string[]
  /** Look in the page's top band (the header), or its bottom half (the composer). */
  readonly near: 'top' | 'bottom'
  /** Pad the full-width bar holding it by this much more on the right; 0 puts it back. */
  readonly pad: number
}

// The top band: a header's button sits under the top inset at most.
const TOP_REACH = 140

/** The script for the page: report each anchor (or that it's gone) as it moves, padding bars as asked. */
export function pageAnchorsScript(watches: readonly PageAnchorWatch[]): string {
  return String.raw`(function () {
var state = window.__xenoAnchors || (window.__xenoAnchors = { rows: {}, at: {} });
state.watches = ${JSON.stringify(watches)};
function bar(button) {
  var el = button.parentElement;
  while (el && el.getBoundingClientRect().width < window.innerWidth - 2) el = el.parentElement;
  return el;
}
function find(watch) {
  var found = null;
  document.querySelectorAll('[aria-label]').forEach(function (el) {
    if (found || watch.labels.indexOf(el.getAttribute('aria-label')) < 0) return;
    var r = el.getBoundingClientRect();
    if (!(r.width > 0)) return;
    var near = watch.near === 'top' ? r.top >= 0 && r.top < ${TOP_REACH} : r.top > window.innerHeight / 2;
    if (near) found = el;
  });
  return found;
}
function pad(name, row, extra) {
  var held = state.rows[name];
  if (held && held.row !== row) { held.row.style.removeProperty('padding-right'); held = state.rows[name] = null; }
  if (!row) return;
  if (!held) held = state.rows[name] = { row: row, base: parseFloat(getComputedStyle(row).paddingRight) || 0 };
  if (extra > 0) row.style.setProperty('padding-right', (held.base + extra) + 'px', 'important');
  else row.style.removeProperty('padding-right');
}
function check() {
  state.pending = false;
  state.watches.forEach(function (watch) {
    var button = find(watch);
    if (watch.near === 'top') pad(watch.name, button ? bar(button) : null, watch.pad);
    var r = button && button.getBoundingClientRect();
    var at = r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',') : '';
    if (at === state.at[watch.name]) return;
    state.at[watch.name] = at;
    try {
      window.orcaBridge.postMessage(JSON.stringify({ type: '${PAGE_ANCHOR_MESSAGE}', name: watch.name, at: at }));
    } catch (e) {}
  });
}
function soon() { if (!state.pending) { state.pending = true; requestAnimationFrame(check); } }
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label', 'style', 'class'] });
  window.addEventListener('resize', soon);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', soon);
}
state.at = {};
check();
})();`
}

/** An anchor's report: where it is now (`at` null: gone), or null when the message isn't one. */
export function readPageAnchorMessage(
  json: string
): { name: PageAnchorName; at: PageAnchor | null } | null {
  if (!json.includes(PAGE_ANCHOR_MESSAGE)) {
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
    parsed.type !== PAGE_ANCHOR_MESSAGE ||
    !('name' in parsed) ||
    (parsed.name !== 'header' && parsed.name !== 'mic') ||
    !('at' in parsed) ||
    typeof parsed.at !== 'string'
  ) {
    return null
  }
  if (parsed.at === '') {
    return { name: parsed.name, at: null }
  }
  const numbers = parsed.at.split(',').map(Number)
  const [x, y, width, height] = numbers
  if (
    numbers.length !== 4 ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    numbers.some((n) => !Number.isFinite(n))
  ) {
    return null
  }
  return { name: parsed.name, at: { x, y, width, height } }
}

/** Beside the host list's menu: just right of it, centred on it, in window points. */
export function headerOrbPlace(button: PageAnchor): { left: number; top: number; size: number } {
  return {
    left: button.x + button.width + HEADER_ORB_GAP,
    top: button.y + (button.height - HEADER_ORB) / 2,
    size: HEADER_ORB
  }
}

/** Just left of the composer's mic, centred on it: where the orb's right edge and middle go, in window points. */
export function micOrbPlace(mic: PageAnchor): { right: number; middle: number } {
  return { right: mic.x - MIC_ORB_GAP, middle: mic.y + mic.height / 2 }
}

type Anchors = Readonly<Partial<Record<PageAnchorName, PageAnchor>>>

function createPageAnchorStore() {
  let shown: Anchors = {}
  let owner: string | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  return {
    read: (): Anchors => shown,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** The focused page's anchors, replacing whatever another page showed. */
    show(page: string, anchors: Anchors): void {
      owner = page
      shown = anchors
      notify()
    },
    forget(page: string): void {
      if (owner === page) {
        owner = null
        shown = {}
        notify()
      }
    }
  }
}

export const pageAnchors = createPageAnchorStore()

/** The focused desktop page's anchors for Xeno's orb. */
export function usePageAnchors(): Anchors {
  return useSyncExternalStore(pageAnchors.subscribe, pageAnchors.read)
}
