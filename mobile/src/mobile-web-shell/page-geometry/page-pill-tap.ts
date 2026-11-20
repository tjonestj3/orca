export const HOLD_HAPTIC_MESSAGE = 'xeno-hold-haptic'

/** Whether a message from the page is a hold on the bar's agent tab registering, for the app to be felt. */
export function isHoldHapticMessage(json: string): boolean {
  return json === JSON.stringify({ type: HOLD_HAPTIC_MESSAGE })
}

/**
 * For the session bar's script (page-pill-header): tapOrHold(cell, worktree), which makes the agent's tab in the bar
 * open the worktree's card on a tap and Orca's tab menu on a hold.
 */
export const TAP_OR_HOLD = String.raw`// The agent's tab in the bar: a tap opens the worktree's card, as a tap on its name did; holding opens Orca's tab
// menu (terminal view, rename, close), the tab's own. React Native Web presses a button on the browser's click, so
// a tap's click is turned away from the tab and given to the worktree's name instead, and a hold clicks the tab.
// As quick as iOS's own context menus; the phone taps the moment it registers, before the menu has drawn, so the
// hold is felt at once rather than when the menu shows.
var HOLD_MS = 350;
function tapOrHold(cell, worktree) {
  cell.__xenoWorktree = worktree;
  if (cell.__xenoTap) return;
  cell.__xenoTap = true;
  var timer = null, held = false, x = 0, y = 0;
  function ours() { return cell.getAttribute('data-xeno-pill') === 'tabcap'; }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } }
  cell.addEventListener('touchstart', function (event) {
    held = false;
    if (!ours() || event.touches.length !== 1) return;
    x = event.touches[0].clientX; y = event.touches[0].clientY;
    stop();
    timer = setTimeout(function () {
      timer = null;
      held = true;
      try { window.orcaBridge.postMessage(JSON.stringify({ type: '${HOLD_HAPTIC_MESSAGE}' })); } catch (e) {}
      var button = cell.querySelector('[aria-label]') || cell.firstElementChild;
      cell.__xenoPass = true;
      if (button) button.click();
      cell.__xenoPass = false;
    }, HOLD_MS);
  }, { capture: true, passive: true });
  cell.addEventListener('touchmove', function (event) {
    var t = event.touches[0];
    if (t && Math.abs(t.clientX - x) + Math.abs(t.clientY - y) > 10) stop();
  }, { capture: true, passive: true });
  cell.addEventListener('touchend', stop, { capture: true, passive: true });
  cell.addEventListener('touchcancel', stop, { capture: true, passive: true });
  cell.addEventListener('click', function (event) {
    if (!ours() || cell.__xenoPass) return;
    event.stopPropagation();
    event.preventDefault();
    if (held) { held = false; return; } // the hold already opened the menu
    if (cell.__xenoWorktree) cell.__xenoWorktree.click();
  }, true);
}`
