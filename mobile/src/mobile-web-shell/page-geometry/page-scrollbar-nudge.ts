/**
 * A page resized to a new width (going back from a session, the folded Duo's column comes or goes and the page
 * takes or gives its room at once) keeps its scroll bars where the old edge was: iOS draws each scroller's bar as
 * its own layer and moves it only when that scroller scrolls, so the first scroll after showed the bar mid-screen,
 * at the column's edge, and the next one put it right. On a change of width each scroller that can scroll moves
 * by a pixel and back, a frame apart, which makes iOS lay its bar out at the new edge with nothing seen to move.
 * One at its end (a chat or a terminal following its newest line) goes back to its end, wherever that is by then,
 * so it keeps following.
 */
export const PAGE_SCROLLBAR_NUDGE = String.raw`(function () {
var state = window.__xenoScrollbarNudge || (window.__xenoScrollbarNudge = {});
// Kept across runs: the app runs this again as the column comes or goes, before the page's resize is seen.
if (state.width === undefined) state.width = window.innerWidth;
function scrollers() {
  var found = [];
  if (document.scrollingElement && document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight) {
    found.push(document.scrollingElement);
  }
  document.querySelectorAll('body *').forEach(function (el) {
    if (el.scrollHeight <= el.clientHeight || el.clientHeight === 0) return;
    var oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') found.push(el);
  });
  return found;
}
function nudge() {
  if (window.innerWidth === state.width) return;
  state.width = window.innerWidth;
  var moved = [];
  scrollers().forEach(function (el) {
    var top = el.scrollTop;
    var end = top + el.clientHeight >= el.scrollHeight - 1;
    el.scrollTop = top > 0 ? top - 1 : top + 1;
    if (el.scrollTop !== top) moved.push([el, end ? null : top]);
  });
  if (moved.length) {
    requestAnimationFrame(function () {
      moved.forEach(function (pair) { pair[0].scrollTop = pair[1] === null ? pair[0].scrollHeight : pair[1]; });
    });
  }
}
if (!state.installed) {
  state.installed = true;
  // Once the page has laid itself out at its new width: its own resize handlers go first.
  window.addEventListener('resize', function () { requestAnimationFrame(nudge); });
}
})();`
