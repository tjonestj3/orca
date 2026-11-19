/**
 * Keeps Orca's page from staying scrolled when iOS scrolls it to show a text field the keyboard would cover. The
 * shell lifts the page above the keyboard itself (it reports the keyboard's height), so that scroll only shifts
 * everything: and React Native Web measures a view's place less the page's scroll, so the session header, measured
 * then, found itself above the screen and dropped below the camera full width in full screen, under the column's
 * toggle, until something made it measure again. Only a scroll while a field has focus, or as it loses it, is undone.
 */
export const PAGE_SCROLL_PIN = String.raw`(function () {
if (window.__orcaScrollPin) return;
window.__orcaScrollPin = true;
function typing() {
  var el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
function pin() { if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0); }
window.addEventListener('scroll', function () { if (typing()) pin(); }, { passive: true });
document.addEventListener('focusout', function () { requestAnimationFrame(pin); }, true);
if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { if (typing()) pin(); });
})();`
