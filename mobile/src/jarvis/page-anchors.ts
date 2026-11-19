import { useSyncExternalStore } from 'react'

/**
 * Where Xeno's orb goes on a desktop page, from buttons the page itself reports, found by their labels (as the
 * app's own translation gives them; the page shares its language):
 *
 * - `header`: the host list's "More actions", near the page's top. Full screen on the folded Duo, that page's header
 *   only keeps below the top inset, so instead of pushing it down the camera's height the script pads the bar it's
 *   in clear of the column, which the camera tops.
 * - `plus`: the host list's "New workspace" button, bottom right. The script pads its bar on the right (the search
 *   field gives up the room) and the orb sits just right of the button.
 * - `mic`: a session's mic, near the page's bottom. In chat the composer has room and the orb sits just left of it;
 *   a tab without a composer (a file, a browser) has none, and the orb keeps to a corner instead of floating over
 *   the page. In a terminal the live input row is full, so the script pads it on the right (the input field gives
 *   up the room) and the orb sits just right of the mic.
 * - `question`: an agent's question in place of the composer (its options are radio buttons or checkboxes); its
 *   footer has no room, so the orb steps aside while it shows, as it does for a sheet.
 */
export type PageAnchorName = 'header' | 'mic' | 'question' | 'plus'
export type PageAnchor = { x: number; y: number; width: number; height: number }

export const PAGE_ANCHOR_MESSAGE = 'xeno-page-anchor'

/** Xeno's orb beside the host list's + button, the gap between them, and the room the bar makes for both. */
export const PLUS_ORB = 40
const PLUS_ORB_GAP = 8
export const PLUS_ORB_ROOM = PLUS_ORB + PLUS_ORB_GAP * 2
const MIC_ORB_GAP_ROOM = 8
/** Xeno's orb beside a terminal's mic, and the room its live input row makes for it. */
export const TERMINAL_MIC_ORB = 32
export const TERMINAL_MIC_ROOM = TERMINAL_MIC_ORB + MIC_ORB_GAP_ROOM * 2
const MIC_ORB_GAP = 8

export type PageAnchorWatch = {
  readonly name: PageAnchorName
  /** Found by any of these labels, or (`selector`) by what it is. */
  readonly labels: readonly string[]
  readonly selector?: string
  /** Look in the page's top band (the header), or for the lowest match below it (the composer). */
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
// The bar to make room in: the nearest row at least half the page wide. Not simply the first full-width box: on the
// unfolded Duo a session shares the page with the host list, and that box is the whole page.
function bar(button) {
  var el = button.parentElement;
  while (el && el !== document.body) {
    if (el.getBoundingClientRect().width >= window.innerWidth * 0.5 && getComputedStyle(el).flexDirection === 'row') {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}
function find(watch) {
  // Top: the first match in the page's top band. Bottom: the lowest match below it; the keyboard lifts the
  // composer above the page's middle, so 'the bottom half' would lose it while typing.
  var found = null, foundTop = -Infinity;
  document.querySelectorAll(watch.selector || '[aria-label]').forEach(function (el) {
    if (!watch.selector && watch.labels.indexOf(el.getAttribute('aria-label')) < 0) return;
    var r = el.getBoundingClientRect();
    if (!(r.width > 0)) return;
    if (watch.near === 'top') {
      if (!found && r.top >= 0 && r.top < ${TOP_REACH}) found = el;
    } else if (r.top >= ${TOP_REACH} && r.top > foundTop) {
      found = el; foundTop = r.top;
    }
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
    // Only a bar asked to make room is touched; padding is put back when it's no longer asked for.
    if (watch.pad > 0 || state.rows[watch.name]) pad(watch.name, button ? bar(button) : null, watch.pad);
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
    (parsed.name !== 'header' &&
      parsed.name !== 'mic' &&
      parsed.name !== 'question' &&
      parsed.name !== 'plus') ||
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

/** Just right of the host list's + button, centred on it, in window points. */
export function plusOrbPlace(plus: PageAnchor): { left: number; top: number; size: number } {
  return {
    left: plus.x + plus.width + PLUS_ORB_GAP,
    top: plus.y + (plus.height - PLUS_ORB) / 2,
    size: PLUS_ORB
  }
}

/** Just right of a terminal's mic, centred on it, in window points. */
export function terminalMicOrbPlace(mic: PageAnchor): { left: number; top: number; size: number } {
  return {
    left: mic.x + mic.width + MIC_ORB_GAP_ROOM,
    top: mic.y + (mic.height - TERMINAL_MIC_ORB) / 2,
    size: TERMINAL_MIC_ORB
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
