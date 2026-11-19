/**
 * Repaints Orca's session page, which the desktop serves, in the chosen theme: a script the shell runs in it as
 * each page loads. The page is React Native Web, so its colours live in style rules it adds as it renders and in
 * inline styles; the script swaps Orca's colours in both, now and as they come. Plain source, since the app's
 * engine can't turn its own functions back into text.
 */

// colourKey and repaintText, run in the page and by the tests.
export const REPAINT_CORE = String.raw`
function colourKey(token) {
  var t = token.trim().toLowerCase();
  var r, g, b, a = 1;
  if (t.charAt(0) === '#') {
    var h = t.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else {
    var m = /^rgba?\(([^)]*)\)$/.exec(t);
    if (!m) return null;
    var parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    r = parts[0]; g = parts[1]; b = parts[2]; if (parts.length > 3) a = parts[3];
  }
  return [r, g, b, Math.round(a * 100) / 100].join(',');
}
function repaintText(text, map) {
  return text.replace(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g, function (token) {
    var key = colourKey(token);
    return key !== null && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : token;
  });
}`

const INSTALL = String.raw`
var state = window.__orcaRepaint || (window.__orcaRepaint = {});
// Nothing painted yet and nothing to paint: Orca's own look, left alone.
if (!state.installed && PAIRS.length === 0 && !MONO && CODE === null) return;
// What each colour painted so far stood for in Orca's page, so another theme (or Orca's own) can take its place.
var painted = state.painted || (state.painted = {});
var wanted = {};
PAIRS.forEach(function (pair) { var key = colourKey(pair[0]); if (key !== null) wanted[key] = pair[1]; });
var map = {};
Object.keys(painted).forEach(function (key) {
  var orca = painted[key];
  var next = wanted[colourKey(orca)];
  map[key] = next === undefined ? orca : next;
});
Object.keys(wanted).forEach(function (key) { map[key] = wanted[key]; });
PAIRS.forEach(function (pair) {
  var key = colourKey(pair[1]);
  if (key !== null && !(key in painted)) painted[key] = pair[0];
});
state.map = map;
state.code = CODE;
function repaintRule(rule) {
  if (rule.style) {
    for (var i = 0; i < rule.style.length; i++) {
      var name = rule.style[i];
      var value = rule.style.getPropertyValue(name);
      var next = repaintText(value, state.map);
      if (next !== value) rule.style.setProperty(name, next, rule.style.getPropertyPriority(name));
    }
  }
  if (rule.cssRules) for (var j = 0; j < rule.cssRules.length; j++) repaintRule(rule.cssRules[j]);
}
function repaintSheet(sheet) {
  try { for (var i = 0; i < sheet.cssRules.length; i++) repaintRule(sheet.cssRules[i]); } catch (e) {}
}
var PAINTED = ['style', 'fill', 'stroke', 'color'];
function repaintElement(el) {
  if (!el.getAttribute) return;
  PAINTED.forEach(function (name) {
    var value = el.getAttribute(name);
    if (value) { var next = repaintText(value, state.map); if (next !== value) el.setAttribute(name, next); }
  });
  if (el.tagName === 'STYLE' && el.sheet) repaintSheet(el.sheet);
}
// Inline code, as Moshi shows it: its text in the theme's colour. It's the page's only text on a raised ground
// with an edge.
function colourCode(el) {
  if (el.tagName !== 'SPAN') return;
  var code = state.code;
  if (code === null) {
    if (el.hasAttribute('data-orca-code')) { el.style.removeProperty('color'); el.removeAttribute('data-orca-code'); }
    return;
  }
  var look = getComputedStyle(el);
  if (colourKey(look.backgroundColor) !== colourKey(code.raised) || !(parseFloat(look.borderTopWidth) > 0)) return;
  el.style.setProperty('color', code.text, 'important');
  el.setAttribute('data-orca-code', '');
}
function repaintTree(root) {
  repaintElement(root);
  colourCode(root);
  if (!root.querySelectorAll) return;
  root.querySelectorAll('[style],[fill],[stroke],[color],style').forEach(repaintElement);
  root.querySelectorAll(state.code === null ? 'span[data-orca-code]' : 'span').forEach(colourCode);
}
if (!state.installed) {
  state.installed = true;
  var insertRule = CSSStyleSheet.prototype.insertRule;
  CSSStyleSheet.prototype.insertRule = function (rule, index) {
    return insertRule.call(this, typeof rule === 'string' ? repaintText(rule, state.map) : rule, index);
  };
  new MutationObserver(function (changes) {
    changes.forEach(function (change) {
      if (change.type === 'attributes') repaintElement(change.target);
      else change.addedNodes.forEach(function (node) { if (node.nodeType === 1) repaintTree(node); });
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: PAINTED });
}
for (var s = 0; s < document.styleSheets.length; s++) repaintSheet(document.styleSheets[s]);
repaintTree(document.documentElement);
var font = document.getElementById('orca-repaint-font');
if (MONO && !font) {
  font = document.createElement('style');
  font.id = 'orca-repaint-font';
  font.textContent = 'body, body * { font-family: ui-monospace, "SF Mono", Menlo, monospace !important; }';
  document.head.appendChild(font);
} else if (!MONO && font) {
  font.remove();
}`

/** Inline code's text colour in a theme, and the raised ground (as the theme paints it) that marks inline code. */
export type PageCodeColour = { readonly raised: string; readonly text: string }

/**
 * The script for these colour swaps (Orca's, then the theme's), font and inline code colour. Run with none of
 * them after a theme, it puts Orca's own look back.
 */
export function pageRepaintScript(
  pairs: readonly (readonly [string, string])[],
  monospace: boolean,
  code: PageCodeColour | null = null
): string {
  return `(function () {\nvar PAIRS = ${JSON.stringify(pairs)};\nvar MONO = ${monospace};\nvar CODE = ${JSON.stringify(code)};\n${REPAINT_CORE}\n${INSTALL}\n})();`
}
