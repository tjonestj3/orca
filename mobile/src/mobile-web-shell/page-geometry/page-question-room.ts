/**
 * More room for an agent's question in a session. Orca's page caps the question card at 60% of the space under the
 * conversation, so some of it stays in view, and cuts each option's description at three lines; on a phone that
 * means scrolling a small window through long options, and options read in part. While a question shows (found by
 * its options, which are radio buttons or checkboxes), the page script lets the card take most of that space and
 * shows descriptions whole. Nothing changes on the desktop: the page is its own, restyled from outside.
 */
export const QUESTION_ROOM_SHARE = 0.92

export const PAGE_QUESTION_ROOM = String.raw`(function () {
var state = window.__xenoQuestionRoom || (window.__xenoQuestionRoom = {});
function capped(el) {
  var cap = getComputedStyle(el).maxHeight;
  return cap && cap !== 'none';
}
function widen(option) {
  var slot = option.parentElement;
  while (slot && slot !== document.body && !capped(slot)) slot = slot.parentElement;
  if (!slot || slot === document.body || !slot.parentElement) return;
  var room = Math.round(slot.parentElement.getBoundingClientRect().height * ${QUESTION_ROOM_SHARE});
  if (room > 0 && slot.style.getPropertyValue('max-height') !== room + 'px') {
    slot.style.setProperty('max-height', room + 'px', 'important');
  }
}
function unclamp(option) {
  option.querySelectorAll('*').forEach(function (el) {
    if (el.style.getPropertyValue('-webkit-line-clamp') === 'unset') return;
    var clamp = getComputedStyle(el).getPropertyValue('-webkit-line-clamp');
    if (clamp && clamp !== 'none' && clamp !== 'unset') {
      el.style.setProperty('-webkit-line-clamp', 'unset', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    }
  });
}
function check() {
  state.pending = false;
  var options = Array.prototype.filter.call(
    document.querySelectorAll('[role="radio"],[role="checkbox"]'),
    function (el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > window.innerHeight / 3; }
  );
  if (options.length === 0) return;
  widen(options[0]);
  options.forEach(unclamp);
}
function soon() { if (!state.pending) { state.pending = true; requestAnimationFrame(check); } }
if (!state.installed) {
  state.installed = true;
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('resize', soon);
}
check();
})();`
