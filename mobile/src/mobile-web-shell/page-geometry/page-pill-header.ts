import { pillStyles, STYLE_ID } from './page-pill-styles'

/**
 * A session's header as one slim bar at the very top, like Moshi's: Orca's header (the title row and the tab strip)
 * lifted out of the page's layout and laid out on one line over the conversation, which is padded to start below
 * it. Back, then the tabs, as small coloured circles; the worktree and its branch in dim monospace; the desktop as a
 * chip; the branch and menu buttons as circles. Restyled from outside, with CSS only (the page is Orca's, and moving
 * its elements would fight its rendering): the parts are marked with data attributes that one stylesheet styles.
 * Over a chat it floats and the conversation scrolls up under it; over a terminal or a file, which can't scroll
 * under anything, it keeps its place at the top of the page.
 *
 * Found by the header's "More session actions" and the tab strip's "New tab" buttons (as the app's own translation
 * gives them; the page shares its language): the bar is the smallest box holding both. Anything it set is put back
 * as the page had it when the bar is no longer wanted, or the header can't be found.
 */
export type PagePill = {
  readonly moreLabel: string
  readonly newTabLabel: string
  /** The pane's top inset, in points: the bar's own band starts at the pane's top and holds its row below this. */
  readonly top: number
  readonly left: number
  readonly right: number
  /** The theme's panel colour, as #rrggbb: the glass behind the worktree's name. */
  readonly background: string
  /** The desktop's name, for the chip; null for none. */
  readonly chip: string | null
}

// Under the bar, before the conversation's first line; and between the top inset and the bar's row.
const PILL_GAP = 6
const ROW_GAP = 6

export function pagePillHeaderScript(pill: PagePill | null): string {
  return String.raw`(function () {
var state = window.__xenoPill || (window.__xenoPill = { held: [] });
state.pill = ${JSON.stringify(pill)};
state.css = ${JSON.stringify(pill ? pillStyles(pill.chip, pill.background) : '')};
state.marked = state.marked || [];
function hold(el, prop) {
  return { el: el, prop: prop, inline: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) };
}
// Sets a style over the page's own, remembering the page's latest: when the page writes that style while the pill
// covers it (as Orca does once it has measured its header), that write is what goes back when the pill comes off,
// not what the page had the moment the pill went on. What was set is read back as the browser keeps it ('rgba(0, 0,
// 0, 0.35) 0px 8px 24px', not as written), or the pill's own colours would pass for the page's and go back with it.
function set(el, prop, value) {
  var held = null;
  state.held.forEach(function (h) { if (h.el === el && h.prop === prop) held = h; });
  if (!held) { held = hold(el, prop); state.held.push(held); }
  var current = el.style.getPropertyValue(prop), priority = el.style.getPropertyPriority(prop);
  var ours = held.applied !== undefined && current === held.applied && priority === 'important';
  if (ours && held.wanted === value) return;
  if (held.applied !== undefined && !ours) {
    held.inline = current;
    held.priority = priority;
  }
  el.style.setProperty(prop, value, 'important');
  held.wanted = value;
  held.applied = el.style.getPropertyValue(prop);
}
// Puts one style back: the page's, unless the page has written it since the last check, when its write stands.
function putBack(h) {
  var current = h.el.style.getPropertyValue(h.prop), priority = h.el.style.getPropertyPriority(h.prop);
  if (h.applied !== undefined && !(current === h.applied && priority === 'important')) return;
  if (h.inline) h.el.style.setProperty(h.prop, h.inline, h.priority);
  else h.el.style.removeProperty(h.prop);
}
function restoreAll() {
  state.held.forEach(putBack);
  state.held = [];
  state.marked.forEach(unmark);
  state.marked = [];
  stylesheet('');
  state.at = null;
  state.mode = null;
  state.content = null;
  state.rows = null;
}
// A button by its label, shown, or inside the pill already up: the pill hides the new tab button it is found by,
// and must still find itself the next time it looks, or it would come off and go back on at every check.
function byLabel(label, within) {
  var found = null;
  document.querySelectorAll('[aria-label]').forEach(function (el) {
    if (found || el.getAttribute('aria-label') !== label) return;
    if (el.getBoundingClientRect().width > 0 || (within && within.contains(el))) found = el;
  });
  return found;
}
function common(a, b) {
  for (var el = a.parentElement; el && el !== document.body; el = el.parentElement) if (el.contains(b)) return el;
  return null;
}
// The conversation: the chat's transcript, the biggest scrolling box in the chat view that isn't its lower region
// (the composer and an agent's question, which scrolls too, and can be the bigger while a question is tall).
function conversation(chrome) {
  var pane = chrome.parentElement && chrome.parentElement.parentElement;
  var root = document.querySelector('[data-testid="native-chat-view"]') || pane;
  if (!root) return null;
  var lower = root.querySelector('[data-testid="native-chat-lower-scroll"]');
  var best = null, area = 0;
  root.querySelectorAll('*').forEach(function (el) {
    if (chrome.contains(el) || (lower && (lower === el || lower.contains(el)))) return;
    var oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') return;
    var r = el.getBoundingClientRect();
    if (r.width * r.height > area && r.height > window.innerHeight * 0.3) { best = el; area = r.width * r.height; }
  });
  return best;
}
// Puts back what was set on one element (the conversation padded before, when it's another now).
function restoreOn(el) {
  state.held = state.held.filter(function (h) {
    if (h.el !== el) return true;
    putBack(h);
    return false;
  });
}
// Marks a part of the header for the stylesheet. Marks are attributes React doesn't own, so it leaves them be.
function mark(el, attr, value) {
  if (!el) return;
  if (el.getAttribute(attr) !== value) el.setAttribute(attr, value);
  if (state.next.indexOf(el) < 0) state.next.push(el);
}
function unmark(el) {
  el.removeAttribute('data-xeno-pill');
  el.removeAttribute('data-xeno-btn');
  el.removeAttribute('data-xeno-conn');
  el.removeAttribute('data-xeno-tabs');
}
// The desktop's connection from the colour of Orca's status dot: green connected, red lost, else on its way.
function connection(dot) {
  var rgb = (getComputedStyle(dot).backgroundColor.match(/[\d.]+/g) || []).map(Number);
  if (rgb.length < 3 || rgb[3] === 0) return 'wait';
  if (rgb[0] > 180 && rgb[0] - rgb[1] > 70) return 'down';
  if (rgb[1] > 140 && rgb[1] > rgb[0] + 20) return 'ok';
  return 'wait';
}
function stylesheet(css) {
  var sheet = document.getElementById('${STYLE_ID}');
  if (!css) { if (sheet) sheet.remove(); return; }
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = '${STYLE_ID}';
    document.head.appendChild(sheet);
  }
  if (sheet.textContent !== css) sheet.textContent = css;
}
// The rows inside the bar: the nearest row at least 60% of its width above a button.
function rowOf(button, chrome) {
  for (var el = button.parentElement; el && el !== chrome; el = el.parentElement) {
    if (getComputedStyle(el).flexDirection === 'row' && el.getBoundingClientRect().width >= chrome.getBoundingClientRect().width * 0.6) return el;
  }
  return null;
}
function labelled(el) {
  return Array.prototype.slice.call(el.querySelectorAll('[aria-label]'));
}
// Moshi's row: back (yellow), the tabs (green, with their count), the worktree and branch, the desktop's chip,
// the branch button (salmon) and the menu (blue). The boxes holding Orca's title row and tab strip step out of
// the layout (display: contents) so their parts share the bar's row, ordered there; the agent's tab and + are
// hidden (the tabs list has both).
function lay(chrome, more, tab) {
  mark(chrome, 'data-xeno-pill', 'bar');
  // Once laid out on one line the rows have no box of their own to measure: the ones found before still hold.
  var rows = state.rows;
  if (!rows || rows.chrome !== chrome || !rows.title.contains(more) || !rows.tab.contains(tab)) {
    var found = rowOf(more, chrome), strip = rowOf(tab, chrome);
    rows = state.rows = found && strip && found !== strip ? { chrome: chrome, title: found, tab: strip } : null;
  }
  if (!rows || rows.title.children.length < 3) return;
  // The title row and the boxes above it stay boxes, one line high: Orca places the workspace card (tap the name)
  // below them, so they must still measure where they are. The tab strip's boxes step out of the layout, and the
  // tabs circle is placed beside back.
  for (var el = rows.title; el && el !== chrome; el = el.parentElement) mark(el, 'data-xeno-pill', 'line');
  for (var box = rows.tab; box && box !== chrome; box = box.parentElement) mark(box, 'data-xeno-pill', 'flat');
  var parts = Array.prototype.slice.call(rows.title.children);
  var lead = parts[0], title = parts[1], trail = parts[parts.length - 1];
  mark(lead, 'data-xeno-pill', 'lead');
  mark(title, 'data-xeno-pill', 'title');
  mark(trail, 'data-xeno-pill', 'trail');
  var backs = labelled(lead);
  mark(backs[backs.length - 1], 'data-xeno-btn', 'yellow');
  labelled(trail).forEach(function (button) {
    mark(button, 'data-xeno-btn', button === more ? 'blue' : 'salmon');
  });
  var block = title.querySelector('[role="button"]');
  if (block) {
    mark(block, 'data-xeno-pill', 'tblock');
    var name = block.firstElementChild, meta = name && name.nextElementSibling;
    mark(name, 'data-xeno-pill', 'ttext');
    if (meta) {
      mark(meta, 'data-xeno-pill', 'tmeta');
      // The connection dot before the branch: Moshi's line is words only, so it shows as the chip's colour instead.
      var dot = meta.firstElementChild;
      if (dot && dot !== meta.lastElementChild && !dot.textContent.trim()) {
        mark(dot, 'data-xeno-pill', 'state');
        mark(chrome, 'data-xeno-conn', connection(dot));
      }
    }
  }
  Array.prototype.forEach.call(rows.tab.children, function (cell, i) {
    if (i === 0 || cell.contains(tab)) { mark(cell, 'data-xeno-pill', 'hide'); return; }
    mark(cell, 'data-xeno-pill', 'count');
    mark(cell, 'data-xeno-btn', 'green');
    mark(chrome, 'data-xeno-tabs', 'on');
    // Orca's dot for another tab needing you, a badge on the circle.
    Array.prototype.forEach.call(cell.children, function (part, j) {
      if (j > 0 && getComputedStyle(part).position === 'absolute') mark(part, 'data-xeno-pill', 'alert');
    });
  });
}
function check() {
  state.pending = false;
  // Nothing moves under a sheet or menu: leave the bar as it is until it closes.
  if (state.pill && state.at && document.querySelector('[aria-modal="true"]')) return;
  var pill = state.pill;
  var floating = state.at && state.at.isConnected && state.at.getBoundingClientRect().width > 0 ? state.at : null;
  var more = pill && byLabel(pill.moreLabel, floating);
  var tab = pill && byLabel(pill.newTabLabel, floating);
  var chrome = more && tab ? common(more, tab) : null;
  if (!chrome) { if (state.held.length || state.marked.length) restoreAll(); return; }
  // Over a chat the bar floats and the conversation scrolls up under it; over a terminal (or a file), which can't
  // scroll under anything, it keeps its place in the page. The page says which shows, more surely than the app's
  // guess, which lags a switch between them.
  var chat = document.querySelector('[data-testid="native-chat-view"]');
  var mode = chat && chat.getBoundingClientRect().width > 0 ? 'float' : 'flow';
  if ((state.at && state.at !== chrome) || (state.mode && state.mode !== mode)) restoreAll();
  state.at = chrome;
  state.mode = mode;
  stylesheet(state.css);
  state.next = [];
  lay(chrome, more, tab);
  // What was marked before and isn't now (the page redrew a part) loses its mark.
  state.marked.forEach(function (el) { if (state.next.indexOf(el) < 0) unmark(el); });
  state.marked = state.next;
  set(chrome, 'padding-bottom', '8px');
  set(chrome, 'padding-left', '14px');
  set(chrome, 'padding-right', '14px');
  // The tab strip's line across the top is gone with the strip's row.
  for (var row = tab.parentElement; row && row !== chrome; row = row.parentElement) {
    if (parseFloat(getComputedStyle(row).borderTopWidth) > 0) { set(row, 'border-top-width', '0px'); break; }
  }
  if (mode === 'flow') return;
  var list = conversation(chrome);
  set(chrome, 'position', 'absolute');
  set(chrome, 'top', '0px');
  set(chrome, 'left', pill.left + 'px');
  set(chrome, 'right', pill.right + 'px');
  set(chrome, 'z-index', '20');
  set(chrome, 'height', 'auto');
  set(chrome, 'min-height', '0px');
  set(chrome, 'padding-top', (pill.top + ${ROW_GAP}) + 'px');
  var content = list && list.firstElementChild;
  if (state.content && state.content !== content) restoreOn(state.content);
  state.content = content;
  if (content) set(content, 'padding-top', (chrome.getBoundingClientRect().height + ${PILL_GAP}) + 'px');
  // React Native Web gives every view its own stacking layer, so the bar's z-index only counts within its
  // wrapper: lift each wrapper up to the one it shares with the conversation, which would draw over it otherwise.
  for (var up = chrome.parentElement; up && up !== document.body && !(list && up.contains(list)); up = up.parentElement) {
    set(up, 'z-index', '20');
    // A rule under where the header sat would cross the chat now.
    if (parseFloat(getComputedStyle(up).borderBottomWidth) > 0) set(up, 'border-bottom-width', '0px');
  }
}
// At once when there's been no check for a quarter second (the keyboard closing, a message sent: the orb and bar
// follow without a lag), else when that quarter second is up: at most four checks a second through a busy stretch.
function soon() {
  if (state.pending) return;
  state.pending = true;
  var wait = Math.max(0, 250 - (Date.now() - (state.checkedAt || 0)));
  setTimeout(function () {
    requestAnimationFrame(function () {
      state.checkedAt = Date.now();
      check();
    });
  }, wait);
}
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('resize', soon);
}
check();
})();`
}

/**
 * Where the bar sits in a session's pane: across its top, holding its row under the page's own top inset (not the
 * camera's band, which the shell adds for Orca's header), and clear of the folded Duo's column on its side, which
 * the camera tops.
 */
// On the session sheet (session-sheet): it starts 10 pt down, which already clears that much of the top inset, and
// its grab handle takes the sheet's top 11 pt. The bar's row goes just under the handle, as Moshi's does.
const SHEET_TOP = 10
const UNDER_HANDLE = 8

export function pillPlace(
  fold: { safeAreaInsets: { top: number }; raisedBy: number },
  column: { side: 'left' | 'right'; width: number; extended: boolean } | null,
  sheet = false
): { top: number; left: number; right: number } {
  const over = column?.extended ? column : null
  return {
    top: sheet
      ? Math.max(0, fold.safeAreaInsets.top - fold.raisedBy - SHEET_TOP) + UNDER_HANDLE
      : Math.max(0, fold.safeAreaInsets.top - fold.raisedBy),
    left: over?.side === 'left' ? over.width : 0,
    right: over?.side === 'right' ? over.width : 0
  }
}
