/**
 * A session's header as one floating pill, like Moshi's: Orca's header (the title row with the worktree and its
 * branch line, and the tab strip) lifted out of the page's layout to float over the conversation as one rounded,
 * see-through bar, and the conversation padded to start below it, so it scrolls up under the pill. Restyled from
 * outside (the page is Orca's, and its rows can't be rearranged without fighting its rendering), so on a phone the
 * pill keeps Orca's two lines. Chat only: a terminal can't scroll under anything, and keeps Orca's header.
 *
 * Found by the header's "More session actions" and the tab strip's "New tab" buttons (as the app's own translation
 * gives them; the page shares its language): the pill is the smallest box holding both. Anything it set is put back
 * as the page had it when the pill is no longer wanted, or the header can't be found.
 */
export type PagePill = {
  readonly moreLabel: string
  readonly newTabLabel: string
  /** Where the pill sits in its pane, in points: below the top inset, clear of the folded Duo's camera. */
  readonly top: number
  readonly left: number
  readonly right: number
  /** The theme's panel colour, as #rrggbb; the pill shows it see-through. */
  readonly background: string
}

// Under the pill, before the conversation's first line.
const PILL_GAP = 8

export function pagePillHeaderScript(pill: PagePill | null): string {
  return String.raw`(function () {
var state = window.__xenoPill || (window.__xenoPill = { held: [] });
state.pill = ${JSON.stringify(pill)};
function hold(el, prop) {
  return { el: el, prop: prop, inline: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) };
}
function set(el, prop, value) {
  if (!state.held.some(function (h) { return h.el === el && h.prop === prop; })) state.held.push(hold(el, prop));
  if (el.style.getPropertyValue(prop) !== value || el.style.getPropertyPriority(prop) !== 'important') {
    el.style.setProperty(prop, value, 'important');
  }
}
function restoreAll() {
  state.held.forEach(function (h) {
    if (h.inline) h.el.style.setProperty(h.prop, h.inline, h.priority);
    else h.el.style.removeProperty(h.prop);
  });
  state.held = [];
  state.at = null;
}
function byLabel(label) {
  var found = null;
  document.querySelectorAll('[aria-label]').forEach(function (el) {
    if (!found && el.getAttribute('aria-label') === label && el.getBoundingClientRect().width > 0) found = el;
  });
  return found;
}
function common(a, b) {
  for (var el = a.parentElement; el && el !== document.body; el = el.parentElement) if (el.contains(b)) return el;
  return null;
}
function rgba(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
// The conversation: the biggest scrolling box in the pill's pane.
function conversation(chrome) {
  var pane = chrome.parentElement && chrome.parentElement.parentElement;
  if (!pane) return null;
  var best = null, area = 0;
  pane.querySelectorAll('*').forEach(function (el) {
    if (chrome.contains(el)) return;
    var oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') return;
    var r = el.getBoundingClientRect();
    if (r.width * r.height > area && r.height > window.innerHeight * 0.3) { best = el; area = r.width * r.height; }
  });
  return best;
}
function check() {
  state.pending = false;
  // Nothing moves under a sheet or menu: leave the pill as it is until it closes.
  if (state.pill && state.at && document.querySelector('[aria-modal="true"]')) return;
  var pill = state.pill;
  var more = pill && byLabel(pill.moreLabel);
  var tab = pill && byLabel(pill.newTabLabel);
  var chrome = more && tab ? common(more, tab) : null;
  if (!chrome) { if (state.held.length) restoreAll(); return; }
  if (state.at && state.at !== chrome) restoreAll();
  state.at = chrome;
  var bg = rgba(pill.background, 0.78);
  set(chrome, 'position', 'absolute');
  set(chrome, 'top', pill.top + 'px');
  set(chrome, 'left', pill.left + 'px');
  set(chrome, 'right', pill.right + 'px');
  set(chrome, 'z-index', '20');
  set(chrome, 'min-height', '0px');
  set(chrome, 'padding-top', '4px');
  set(chrome, 'padding-bottom', '0px');
  set(chrome, 'padding-left', '4px');
  set(chrome, 'padding-right', '4px');
  set(chrome, 'border-radius', '22px');
  set(chrome, 'overflow', 'hidden');
  set(chrome, 'background-color', bg);
  set(chrome, 'border', '1px solid rgba(255,255,255,0.08)');
  set(chrome, 'box-shadow', '0 8px 24px rgba(0,0,0,0.35)');
  set(chrome, '-webkit-backdrop-filter', 'blur(16px) saturate(140%)');
  set(chrome, 'backdrop-filter', 'blur(16px) saturate(140%)');
  // The tab strip's line across the top is the pill's own edge now.
  for (var row = tab.parentElement; row && row !== chrome; row = row.parentElement) {
    if (parseFloat(getComputedStyle(row).borderTopWidth) > 0) { set(row, 'border-top-width', '0px'); break; }
  }
  var list = conversation(chrome);
  var content = list && list.firstElementChild;
  if (content) set(content, 'padding-top', (chrome.getBoundingClientRect().height + pill.top + ${PILL_GAP}) + 'px');
}
function soon() { if (!state.pending) { state.pending = true; requestAnimationFrame(check); } }
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('resize', soon);
}
check();
})();`
}

// The pill's margin from its pane's edges, and from the top inset.
const PILL_MARGIN = 8

/**
 * Where the pill sits in a session's pane: just under the page's own top inset (not the camera's band, which the
 * shell adds for Orca's header), and clear of the folded Duo's column on its side, which the camera tops.
 */
export function pillPlace(
  fold: { safeAreaInsets: { top: number }; raisedBy: number },
  column: { side: 'left' | 'right'; width: number; extended: boolean } | null
): { top: number; left: number; right: number } {
  const over = column?.extended ? column : null
  return {
    top: Math.max(0, fold.safeAreaInsets.top - fold.raisedBy) + PILL_MARGIN,
    left: PILL_MARGIN + (over?.side === 'left' ? over.width : 0),
    right: PILL_MARGIN + (over?.side === 'right' ? over.width : 0)
  }
}
