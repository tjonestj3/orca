/**
 * The stylesheet for a session's bar (page-pill-header): Moshi's look, applied to Orca's header parts by the data
 * attributes the bar's script marks them with.
 */
// Moshi's colours: pastel circles with dark icons, and a teal chip.
const INK = '#1e1e2e'
// The circles, the name's capsule and the chip: Moshi's small round buttons.
export const DOT = 22

export const STYLE_ID = 'xeno-pill-style'

/** A CSS string holding `text`, for a stylesheet's `content`. */
function cssString(text: string): string {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r]+/g, ' ')}"`
}

/** `hex` (#rrggbb) at opacity `a`. */
function rgba(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export function pillStyles(chip: string | null, background: string): string {
  const bar = '[data-xeno-pill="bar"]'
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace'
  const system = '-apple-system, system-ui, "Helvetica Neue", sans-serif'
  const rules = [
    // No strip: the bar itself is clear, only its circles, the name's capsule and the chip show over the chat.
    `${bar} { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 8px !important; background-color: transparent !important; border-width: 0 !important; box-shadow: none !important; }`,
    // Inside the bar only icons, words and the circles: Orca fills its buttons and the active tab, and rules its rows.
    // (:where keeps this rule's weight that of "bar *", so the circles' colours below still win.)
    `${bar} *:where(:not([data-xeno-pill="state"], [data-xeno-pill="alert"])) { background-color: transparent !important; border-width: 0 !important; box-shadow: none !important; }`,
    // Over a chat the bar floats, clear: a fade from the page's colour, behind its parts, keeps the words scrolling
    // up under it off the circles. (The bar floating is its own layer, so -1 is still above what it floats over.)
    `${bar}[data-xeno-mode="float"]::before { content: ""; position: absolute; left: 0; right: 0; top: 0; bottom: -12px; z-index: -1; pointer-events: none; background-image: linear-gradient(to bottom, ${rgba(background, 0.96)} 0%, ${rgba(background, 0.9)} 70%, ${rgba(background, 0)} 100%); }`,
    `${bar} [data-xeno-pill="flat"] { display: contents !important; }`,
    `${bar} [data-xeno-pill="line"] { display: flex !important; flex-direction: row !important; align-items: center !important; flex: 1 1 auto !important; min-width: 0 !important; height: ${DOT}px !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; gap: 8px !important; }`,
    `${bar} [data-xeno-pill="hide"], ${bar} [data-xeno-pill="state"] { display: none !important; }`,
    `${bar} [data-xeno-pill="lead"] { order: 1 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    `${bar} [data-xeno-pill="ghost"] { flex: 1 1 0px !important; min-width: 0 !important; opacity: 0 !important; pointer-events: none !important; }`,
    // The tab strip's row, laid over the title row's middle by the script: tabs circle, agent's tab, chip. Holding
    // the agent's tab opens its menu, so a hold mustn't select its words or show iOS's callout instead.
    `${bar} [data-xeno-pill="tabrow"] { position: absolute !important; height: ${DOT}px !important; min-height: 0 !important; display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; margin: 0 !important; padding: 0 !important; }`,
    `${bar} [data-xeno-pill="count"] { order: 1 !important; }`,
    `${bar} [data-xeno-pill="tabcap"] { order: 2 !important; -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; display: flex !important; flex-direction: row !important; align-items: center !important; flex: 0 1 auto !important; min-width: 0 !important; max-width: none !important; height: ${DOT}px !important; padding: 0 10px !important; box-sizing: border-box !important; border-radius: ${DOT / 2}px !important; overflow: hidden !important; background-color: ${rgba(background, 0.82)} !important; -webkit-backdrop-filter: blur(12px) !important; backdrop-filter: blur(12px) !important; }`,
    `${bar} [data-xeno-pill="tabcap"] * { min-width: 0 !important; min-height: 0 !important; height: auto !important; padding: 0 !important; margin: 0 !important; font-family: ${mono} !important; font-size: 13px !important; font-weight: 400 !important; color: rgba(205, 214, 244, 0.85) !important; white-space: nowrap !important; }`,
    `${bar} [data-xeno-pill="tabcap"] > * { flex: 1 1 auto !important; display: flex !important; flex-direction: row !important; align-items: center !important; gap: 6px !important; overflow: hidden !important; }`,
    `${bar} [data-xeno-pill="trail"] { order: 4 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    // The name and branch on a glass capsule, as tall as the circles, readable over whatever scrolls under it.
    `${bar} [data-xeno-pill="tblock"] { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; flex: 0 1 auto !important; min-width: 0 !important; max-width: 100% !important; height: ${DOT}px !important; min-height: 0 !important; padding: 0 10px !important; box-sizing: border-box !important; border-radius: ${DOT / 2}px !important; background-color: ${rgba(background, 0.82)} !important; -webkit-backdrop-filter: blur(12px) !important; backdrop-filter: blur(12px) !important; }`,
    `${bar} [data-xeno-pill="tblock"] * { font-family: ${mono} !important; font-size: 13px !important; font-weight: 400 !important; color: rgba(205, 214, 244, 0.75) !important; text-align: left !important; }`,
    `${bar} [data-xeno-pill="ttext"] { flex: 0 1 auto !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }`,
    `${bar} [data-xeno-pill="tmeta"] { display: flex !important; flex-direction: row !important; align-items: center !important; flex: 0 3 auto !important; min-width: 0 !important; gap: 0 !important; opacity: 0.7 !important; }`,
    `${bar} [data-xeno-btn] { width: ${DOT}px !important; height: ${DOT}px !important; min-width: ${DOT}px !important; min-height: ${DOT}px !important; max-width: ${DOT}px !important; padding: 0 !important; margin: 0 !important; border-radius: ${DOT / 2}px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex: 0 0 auto !important; }`,
    `${bar} [data-xeno-btn] * { min-width: 0 !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; color: ${INK} !important; font-family: ${system} !important; font-size: 12px !important; font-weight: 700 !important; }`,
    `${bar} [data-xeno-btn] svg { width: 13px !important; height: 13px !important; }`,
    `${bar} [data-xeno-btn] svg, ${bar} [data-xeno-btn] svg * { stroke: ${INK} !important; }`,
    `${bar} [data-xeno-btn="yellow"] { background-color: #f9e2af !important; }`,
    `${bar} [data-xeno-btn="green"] { background-color: #a6e3a1 !important; }`,
    `${bar} [data-xeno-btn="salmon"] { background-color: #f5a97f !important; }`,
    `${bar} [data-xeno-btn="blue"] { background-color: #8aadf4 !important; }`,
    // Back as Moshi's minimise: a dash in the yellow circle.
    `${bar} [data-xeno-btn="yellow"] > * { display: none !important; }`,
    `${bar} [data-xeno-btn="yellow"]::after { content: ""; width: 10px; height: 2.5px; border-radius: 2px; background: ${INK}; }`,
    // Another tab needs you: Orca's red dot, as a badge on the tabs circle.
    `${bar} [data-xeno-btn] [data-xeno-pill="alert"] { position: absolute !important; top: -2px !important; right: -2px !important; left: auto !important; width: 10px !important; height: 10px !important; border-radius: 5px !important; background-color: #f38ba8 !important; border: 1.5px solid ${INK} !important; }`
  ]
  if (chip) {
    rules.push(
      `${bar} [data-xeno-pill="tabrow"]::after { content: ${cssString(chip)}; order: 3; flex: 0 0 auto; margin-left: auto; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; box-sizing: border-box; height: ${DOT}px; line-height: ${DOT}px; padding: 0 11px; border-radius: ${DOT / 2}px; text-align: center; background: #17463f; color: #5fe0c3; font-family: ${system} !important; font-size: 12px !important; font-weight: 600 !important; }`,
      // The desktop's connection, read from Orca's status dot: teal connected, amber on its way, red lost.
      `${bar}[data-xeno-conn="wait"] [data-xeno-pill="tabrow"]::after { background: #4a3d16; color: #f9e2af; }`,
      `${bar}[data-xeno-conn="down"] [data-xeno-pill="tabrow"]::after { background: #4d1f2a; color: #f38ba8; }`
    )
  }
  return rules.join('\n')
}
