/**
 * Return sends in a session's composer. Orca's composer is a text box where Return makes a new line, sending on
 * Enter only where Shift+Enter can make one instead: the iPhone's keyboard has no Shift+Return, so Return there
 * could only ever add a line (Nov 21: "pressing enter on the iOS keyboard doesn't send"). The script presses the
 * composer's own send button (or save, while editing a message), and labels the keyboard's key "send".
 *
 * Left alone: Shift+Return (a hardware keyboard's new line), text still being composed (dictation, other
 * scripts' keyboards), and Return while the composer's @ or / menu is open, which picks from the menu.
 */
export function pageEnterSendsScript(sendLabels: readonly string[]): string {
  return String.raw`(function () {
var state = window.__xenoEnterSends || (window.__xenoEnterSends = {});
state.labels = ${JSON.stringify(sendLabels)};
function composer(el) {
  return el && el.closest ? el.closest('[data-testid="native-chat-composer"]') : null;
}
function menuOpen() {
  var menu = document.querySelector('[data-testid="native-chat-composer-menu-card"]');
  return !!menu && menu.getBoundingClientRect().height > 0;
}
function sendButton(box) {
  var found = null;
  box.querySelectorAll('[aria-label]').forEach(function (el) {
    if (!found && state.labels.indexOf(el.getAttribute('aria-label')) >= 0) found = el;
  });
  return found;
}
if (!state.installed) {
  state.installed = true;
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.isComposing || event.keyCode === 229) return;
    var box = composer(event.target);
    if (!box || event.target.tagName !== 'TEXTAREA' || menuOpen()) return;
    var button = sendButton(box);
    event.preventDefault();
    event.stopPropagation();
    if (!button || button.getAttribute('aria-disabled') === 'true' || button.disabled) return;
    button.click();
  }, true);
  // The keyboard's Return key reads "send" in the composer.
  document.addEventListener('focusin', function (event) {
    var el = event.target;
    if (el && el.tagName === 'TEXTAREA' && composer(el) && el.getAttribute('enterkeyhint') !== 'send') {
      el.setAttribute('enterkeyhint', 'send');
    }
  }, true);
}
})();`
}
