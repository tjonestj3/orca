/**
 * For the session bar's script (page-pill-header): columnToggle(at), the folded Duo's full-screen toggle as a
 * circle on the bar, just before its branch and menu circles, while the page extends over the column. The app drew
 * it in the column under the camera, beside Orca's own header; under the slim bar there's nothing beside it, and
 * it sat over the page (a browser tab's view switch, a chat's words). Tapped, it tells the app (COLUMN_TOGGLE_MESSAGE),
 * which brings the column back. Its own element on the page's body, not one of Orca's: React owns those.
 */
import { DOT } from './page-pill-styles'

export const COLUMN_TOGGLE_MESSAGE = 'xeno-column-toggle'
export const COLUMN_TOGGLE_ID = 'xeno-column-toggle'

// Lucide's panel-open icons, as the app's own toggle draws them: the column's side, an arrow out of it.
const ICON_PATH = {
  right: '<path d="M15 3v18"/><path d="m10 15-3-3 3-3"/>',
  left: '<path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>'
}

export function columnToggleIcon(side: 'left' | 'right'): string {
  return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/>${ICON_PATH[side]}</svg>`
}

/** Its look, in the bar's stylesheet: a mauve circle like the bar's others, answering a fingertip 44 pt tall. */
export const COLUMN_TOGGLE_CSS = [
  `#${COLUMN_TOGGLE_ID} { position: fixed; z-index: 2147483000; width: ${DOT}px; height: ${DOT}px; padding: 0; margin: 0; border: 0; border-radius: ${DOT / 2}px; background: #c6a0f6; color: #1e1e2e; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; cursor: pointer; }`,
  `#${COLUMN_TOGGLE_ID}::before { content: ""; position: absolute; top: -11px; bottom: -11px; left: -4px; right: -4px; }`
].join('\n')

/** The script's part: at is { chrome, end } (the bar, and how far from its right edge the circle ends), or null. */
export const COLUMN_TOGGLE = String.raw`function columnToggle(at) {
  var button = document.getElementById('${COLUMN_TOGGLE_ID}');
  var side = state.pill && state.pill.toggle;
  if (!at || !side) { if (button) button.remove(); return; }
  if (!button) {
    button = document.createElement('button');
    button.id = '${COLUMN_TOGGLE_ID}';
    button.type = 'button';
    button.addEventListener('click', function () {
      try { window.orcaBridge.postMessage(JSON.stringify({ type: '${COLUMN_TOGGLE_MESSAGE}' })); } catch (e) {}
    });
    document.body.appendChild(button);
  }
  if (button.getAttribute('data-side') !== side) {
    button.setAttribute('data-side', side);
    button.innerHTML = side === 'left' ? ${JSON.stringify(columnToggleIcon('left'))} : ${JSON.stringify(columnToggleIcon('right'))};
  }
  button.setAttribute('aria-label', state.pill.toggleLabel || '');
  var r = at.chrome.getBoundingClientRect();
  var top = Math.round(r.top + (parseFloat(getComputedStyle(at.chrome).paddingTop) || 0)) + 'px';
  var left = Math.round(r.right - at.end - ${DOT}) + 'px';
  if (button.style.top !== top) button.style.top = top;
  if (button.style.left !== left) button.style.left = left;
  if (button.style.display) button.style.display = '';
}
function columnToggleHide() {
  var button = document.getElementById('${COLUMN_TOGGLE_ID}');
  if (button && button.style.display !== 'none') button.style.display = 'none';
}`

/** Whether a message from the page is the bar's full-screen toggle being tapped. */
export function isColumnToggleMessage(json: string): boolean {
  if (!json.includes(COLUMN_TOGGLE_MESSAGE)) {
    return false
  }
  try {
    const parsed: unknown = JSON.parse(json)
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      parsed.type === COLUMN_TOGGLE_MESSAGE
    )
  } catch {
    return false
  }
}
