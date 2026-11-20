/**
 * For the session bar's script (page-pill-header): promptRoom(chrome), which lets a question's card take the room
 * under the floating bar.
 */
// The card's gap under the bar.
const PROMPT_GAP = 8

export const PROMPT_ROOM = String.raw`// A question's card: Orca lets it take 60% of the chat's height until you start answering, which on a phone shows
// the question and barely an option. It may take all the room between the bar and the chat's bottom. (The card's
// box is the outermost one in the region below the chat with a height cap of its own; the composer's isn't one.)
function promptRoom(chrome) {
  var lower = document.querySelector('[data-testid="native-chat-lower-scroll"]');
  var root = document.querySelector('[data-testid="native-chat-view"]');
  if (!lower || !root) return;
  var bottom = root.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(root).paddingBottom) || 0);
  var view = window.visualViewport;
  if (view && view.height > 0) bottom = Math.min(bottom, view.offsetTop + view.height);
  var room = Math.floor(bottom - chrome.getBoundingClientRect().bottom - ${PROMPT_GAP});
  if (room <= 0) return;
  var cards = [];
  Array.prototype.forEach.call(lower.querySelectorAll('[style*="max-height"]'), function (el) {
    if (!(parseFloat(el.style.maxHeight) > 0) || !el.querySelector('[role="button"]')) return;
    if (el.closest('[data-testid="native-chat-composer"]') || el.querySelector('[data-testid="native-chat-composer"]')) return;
    if (cards.some(function (card) { return card.contains(el); })) return;
    cards.push(el);
  });
  cards.forEach(function (card) { set(card, 'max-height', room + 'px'); });
}
`
