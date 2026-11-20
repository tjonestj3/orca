/**
 * A session's header as one slim bar at the very top, like Moshi's: Orca's header (the title row and the tab strip)
 * lifted out of the page's layout and laid out on one line over the conversation, which is padded to start below
 * it. Back, then the tabs, as small coloured circles; the worktree and its branch in dim monospace; the desktop as a
 * chip; the branch and menu buttons as circles. Restyled from outside, with CSS only (the page is Orca's, and moving
 * its elements would fight its rendering): the parts are marked with data attributes that one stylesheet styles.
 * Chat only (the page's chat view showing): a terminal or a file can't scroll under anything, and keeps Orca's
 * header.
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
  /** The theme's panel colour, as #rrggbb: the bar's ground where the page's own can't be read. */
  readonly background: string
  /** The desktop's name, for the chip; null for none. */
  readonly chip: string | null
}

// Under the bar, before the conversation's first line; and between the top inset and the bar's row.
const PILL_GAP = 6
const ROW_GAP = 6

// Moshi's colours: pastel circles with dark icons, and a teal chip.
const INK = '#1e1e2e'
const STYLE_ID = 'xeno-pill-style'

/** A CSS string holding `text`, for a stylesheet's `content`. */
function cssString(text: string): string {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r]+/g, ' ')}"`
}

function pillStyles(chip: string | null): string {
  const bar = '[data-xeno-pill="bar"]'
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace'
  const system = '-apple-system, system-ui, "Helvetica Neue", sans-serif'
  const rules = [
    `${bar} { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 8px !important; }`,
    // Inside the bar only icons, words and the circles: Orca fills its buttons and the active tab, and rules its rows.
    `${bar} * { background-color: transparent !important; border-width: 0 !important; box-shadow: none !important; }`,
    `${bar} [data-xeno-pill="flat"] { display: contents !important; }`,
    `${bar} [data-xeno-pill="hide"] { display: none !important; }`,
    `${bar} [data-xeno-pill="lead"] { order: 1 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    `${bar} [data-xeno-pill="count"] { order: 2 !important; }`,
    `${bar} [data-xeno-pill="title"] { order: 3 !important; flex: 1 1 0px !important; min-width: 0 !important; max-width: none !important; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 8px !important; overflow: hidden !important; opacity: 1 !important; }`,
    `${bar} [data-xeno-pill="trail"] { order: 4 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    `${bar} [data-xeno-pill="tblock"] { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 6px !important; flex: 0 1 auto !important; min-width: 0 !important; max-width: 100% !important; padding: 0 !important; min-height: 0 !important; }`,
    `${bar} [data-xeno-pill="tblock"] * { font-family: ${mono} !important; font-size: 13px !important; font-weight: 400 !important; color: rgba(205, 214, 244, 0.6) !important; text-align: left !important; }`,
    `${bar} [data-xeno-pill="ttext"] { flex: 0 1 auto !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }`,
    `${bar} [data-xeno-pill="tmeta"] { display: flex !important; flex-direction: row !important; align-items: center !important; flex: 0 3 auto !important; min-width: 0 !important; gap: 0 !important; }`,
    `${bar} [data-xeno-pill="tmeta"]::before { content: "·"; margin-right: 6px; color: rgba(205, 214, 244, 0.45); }`,
    `${bar} [data-xeno-btn] { width: 26px !important; height: 26px !important; min-width: 26px !important; min-height: 26px !important; max-width: 26px !important; padding: 0 !important; margin: 0 !important; border-radius: 13px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex: 0 0 auto !important; }`,
    `${bar} [data-xeno-btn] * { min-width: 0 !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; color: ${INK} !important; font-family: ${system} !important; font-size: 12px !important; font-weight: 700 !important; }`,
    `${bar} [data-xeno-btn] svg { width: 15px !important; height: 15px !important; }`,
    `${bar} [data-xeno-btn] svg, ${bar} [data-xeno-btn] svg * { stroke: ${INK} !important; }`,
    `${bar} [data-xeno-btn="yellow"] { background-color: #f9e2af !important; }`,
    `${bar} [data-xeno-btn="green"] { background-color: #a6e3a1 !important; }`,
    `${bar} [data-xeno-btn="salmon"] { background-color: #f5a97f !important; }`,
    `${bar} [data-xeno-btn="blue"] { background-color: #8aadf4 !important; }`,
    // Back as Moshi's minimise: a dash in the yellow circle.
    `${bar} [data-xeno-btn="yellow"] > * { display: none !important; }`,
    `${bar} [data-xeno-btn="yellow"]::after { content: ""; width: 11px; height: 2.5px; border-radius: 2px; background: ${INK}; }`
  ]
  if (chip) {
    rules.push(
      `${bar} [data-xeno-pill="title"]::after { content: ${cssString(chip)}; flex: 0 0 auto; margin-left: auto; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; height: 24px; line-height: 24px; padding: 0 10px; border-radius: 12px; background: #17463f; color: #5fe0c3; font: 600 12px ${system}; }`
    )
  }
  return rules.join('\n')
}

export function pagePillHeaderScript(pill: PagePill | null): string {
  return String.raw`(function () {
var state = window.__xenoPill || (window.__xenoPill = { held: [] });
state.pill = ${JSON.stringify(pill)};
state.css = ${JSON.stringify(pill ? pillStyles(pill.chip) : '')};
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
  [rows.title, rows.tab].forEach(function (row) {
    for (var el = row; el && el !== chrome; el = el.parentElement) mark(el, 'data-xeno-pill', 'flat');
  });
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
      // The connection dot before the branch: Moshi's line is words only.
      var dot = meta.firstElementChild;
      if (dot && dot !== meta.lastElementChild && !dot.textContent.trim()) mark(dot, 'data-xeno-pill', 'hide');
    }
  }
  Array.prototype.forEach.call(rows.tab.children, function (cell, i) {
    if (i === 0 || cell.contains(tab)) { mark(cell, 'data-xeno-pill', 'hide'); return; }
    mark(cell, 'data-xeno-pill', 'count');
    mark(cell, 'data-xeno-btn', 'green');
  });
}
// The page's own ground behind the conversation, for the bar's: Moshi's bar is the sheet's colour, not a panel.
function ground(list, fallback) {
  for (var el = list; el && el !== document.documentElement; el = el.parentElement) {
    var bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg;
  }
  return fallback;
}
function check() {
  state.pending = false;
  // Nothing moves under a sheet or menu: leave the bar as it is until it closes.
  if (state.pill && state.at && document.querySelector('[aria-modal="true"]')) return;
  var pill = state.pill;
  // Only over a chat: a terminal (or a file) can't scroll under it. The page says which shows, more surely than the
  // app's guess, which lags a switch between them.
  var chat = pill && document.querySelector('[data-testid="native-chat-view"]');
  var chatShown = !!chat && chat.getBoundingClientRect().width > 0;
  var floating = state.at && state.at.isConnected && state.at.getBoundingClientRect().width > 0 ? state.at : null;
  var more = chatShown && byLabel(pill.moreLabel, floating);
  var tab = chatShown && byLabel(pill.newTabLabel, floating);
  var chrome = more && tab ? common(more, tab) : null;
  if (!chrome) { if (state.held.length || state.marked.length) restoreAll(); return; }
  if (state.at && state.at !== chrome) restoreAll();
  state.at = chrome;
  stylesheet(state.css);
  state.next = [];
  lay(chrome, more, tab);
  // What was marked before and isn't now (the page redrew a part) loses its mark.
  state.marked.forEach(function (el) { if (state.next.indexOf(el) < 0) unmark(el); });
  state.marked = state.next;
  var list = conversation(chrome);
  set(chrome, 'position', 'absolute');
  set(chrome, 'top', '0px');
  set(chrome, 'left', pill.left + 'px');
  set(chrome, 'right', pill.right + 'px');
  set(chrome, 'z-index', '20');
  set(chrome, 'height', 'auto');
  set(chrome, 'min-height', '0px');
  set(chrome, 'padding-top', (pill.top + ${ROW_GAP}) + 'px');
  set(chrome, 'padding-bottom', '8px');
  set(chrome, 'padding-left', '14px');
  set(chrome, 'padding-right', '14px');
  set(chrome, 'background-color', ground(list, pill.background));
  // The tab strip's line across the top is gone with the strip's row.
  for (var row = tab.parentElement; row && row !== chrome; row = row.parentElement) {
    if (parseFloat(getComputedStyle(row).borderTopWidth) > 0) { set(row, 'border-top-width', '0px'); break; }
  }
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
export function pillPlace(
  fold: { safeAreaInsets: { top: number }; raisedBy: number },
  column: { side: 'left' | 'right'; width: number; extended: boolean } | null
): { top: number; left: number; right: number } {
  const over = column?.extended ? column : null
  return {
    top: Math.max(0, fold.safeAreaInsets.top - fold.raisedBy),
    left: over?.side === 'left' ? over.width : 0,
    right: over?.side === 'right' ? over.width : 0
  }
}
