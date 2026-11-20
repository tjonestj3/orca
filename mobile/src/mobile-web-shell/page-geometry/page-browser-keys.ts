/**
 * A browser tab's keys on one line. Orca's page gives the click modifiers (Cmd, Ctrl, Alt, Shift) a row and the keys
 * (Enter, ⌫, Tab, Esc) another under it, each half empty on a phone; laid side by side they take one line, a little
 * tighter, and its free end is where Xeno's orb sits (page-anchors' `keys`), not over Enter. Too narrow for both,
 * the keys wrap under the modifiers as before. Restyled from outside, with CSS only, by the attributes the script
 * marks the rows with: the page is Orca's, and moving its elements would fight its rendering.
 *
 * Found by the Cmd modifier's label (as the app's own translation gives it; the page shares its language): its row
 * is the modifiers', the next is the keys', and their box is the dock that also holds the typing field.
 */
export const BROWSER_KEYS_STYLE_ID = 'xeno-browser-keys-style'

const DOCK = '[data-xeno-keys="dock"]'

export const BROWSER_KEYS_CSS = [
  `${DOCK} { flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important; }`,
  // Anything else in the dock (the typing field's row) keeps a line of its own.
  `${DOCK} > *:not([data-xeno-keys]) { flex: 0 0 100% !important; width: 100% !important; }`,
  `${DOCK} > [data-xeno-keys="mods"], ${DOCK} > [data-xeno-keys="keys"] { flex: 0 0 auto !important; }`,
  // The modifiers' own end padding is the gap between the two groups.
  `${DOCK} > [data-xeno-keys="keys"] { padding-left: 0 !important; }`,
  `${DOCK} > [data-xeno-keys] > * { min-width: 34px !important; padding-left: 6px !important; padding-right: 6px !important; }`
].join('\n')

export function pageBrowserKeysScript(modifierLabel: string): string {
  return String.raw`(function () {
var state = window.__xenoBrowserKeys || (window.__xenoBrowserKeys = { marked: [] });
state.label = ${JSON.stringify(modifierLabel)};
function stylesheet(on) {
  var sheet = document.getElementById('${BROWSER_KEYS_STYLE_ID}');
  if (!on) { if (sheet) sheet.remove(); return; }
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = '${BROWSER_KEYS_STYLE_ID}';
    sheet.textContent = ${JSON.stringify(BROWSER_KEYS_CSS)};
    document.head.appendChild(sheet);
  }
}
function mark(el, value) {
  if (el.getAttribute('data-xeno-keys') !== value) el.setAttribute('data-xeno-keys', value);
}
function check() {
  state.pending = false;
  var cmd = null;
  document.querySelectorAll('[aria-label]').forEach(function (el) {
    if (!cmd && el.getAttribute('aria-label') === state.label && el.getBoundingClientRect().width > 0) cmd = el;
  });
  var mods = cmd && cmd.parentElement;
  var keys = mods && mods.nextElementSibling;
  var dock = mods && mods.parentElement;
  var next = mods && keys && dock && dock.querySelector('input, textarea') ? [dock, mods, keys] : [];
  state.marked.forEach(function (el) { if (next.indexOf(el) < 0) el.removeAttribute('data-xeno-keys'); });
  state.marked = next;
  stylesheet(next.length > 0);
  if (!next.length) return;
  mark(dock, 'dock');
  mark(mods, 'mods');
  mark(keys, 'keys');
}
function soon() {
  if (state.pending) return;
  state.pending = true;
  setTimeout(function () { requestAnimationFrame(check); }, 100);
}
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true });
}
check();
})();`
}
