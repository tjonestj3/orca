/**
 * For the session bar's script (page-pill-header): columnToggle(at), the folded Duo's full-screen toggle as a
 * circle on the bar, just before its branch and menu circles, while the page extends over the column. The app drew
 * it in the column under the camera, beside Orca's own header; under the slim bar there's nothing beside it, and
 * it sat over the page (a browser tab's view switch, a chat's words). Tapped, it tells the app (COLUMN_TOGGLE_MESSAGE),
 * which brings the column back. Its own element on the page's body, not one of Orca's: React owns those.
 */
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

/** Its look, in the bar's stylesheet: one of the bar's circles (data-xeno-btn), mauve, a button reset to bare. */
export const COLUMN_TOGGLE_CSS = [
  `[data-xeno-pill="bar"] [data-xeno-btn="mauve"] { background-color: #c6a0f6 !important; border: 0 !important; cursor: pointer; -webkit-tap-highlight-color: transparent; -webkit-appearance: none; appearance: none; }`
].join('\n')

/**
 * The script's part: columnToggle(trail) puts it first among the bar's branch and menu circles (null: none). It
 * lives in their row, so it's laid out, layered and covered by the page's menus and sheets just as they are
 * (Nov 20: drawn on the page's body above everything, it had to be hidden whenever a menu opened). React leaves
 * an element it didn't make where it is among its own.
 */
export const COLUMN_TOGGLE = String.raw`function columnToggle(trail) {
  var button = document.getElementById('${COLUMN_TOGGLE_ID}');
  var side = state.pill && state.pill.toggle;
  if (!trail || !side) { if (button) button.remove(); return; }
  if (!button) {
    button = document.createElement('button');
    button.id = '${COLUMN_TOGGLE_ID}';
    button.type = 'button';
    button.setAttribute('data-xeno-btn', 'mauve');
    button.addEventListener('click', function () {
      try { window.orcaBridge.postMessage(JSON.stringify({ type: '${COLUMN_TOGGLE_MESSAGE}' })); } catch (e) {}
    });
  }
  if (button.parentElement !== trail || trail.firstElementChild !== button) trail.insertBefore(button, trail.firstElementChild);
  if (button.getAttribute('data-side') !== side) {
    button.setAttribute('data-side', side);
    button.innerHTML = side === 'left' ? ${JSON.stringify(columnToggleIcon('left'))} : ${JSON.stringify(columnToggleIcon('right'))};
  }
  if (button.getAttribute('aria-label') !== (state.pill.toggleLabel || '')) button.setAttribute('aria-label', state.pill.toggleLabel || '');
}
function isColumnToggle(el) { return el.id === '${COLUMN_TOGGLE_ID}'; }`

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
