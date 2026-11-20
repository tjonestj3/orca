/**
 * The stylesheet for a session's bar (page-pill-header): Moshi's look, applied to Orca's header parts by the data
 * attributes the bar's script marks them with.
 */
// Moshi's colours: pastel circles with dark icons, and a teal chip.
const INK = '#1e1e2e'
export const STYLE_ID = 'xeno-pill-style'

/** A CSS string holding `text`, for a stylesheet's `content`. */
function cssString(text: string): string {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r]+/g, ' ')}"`
}

export function pillStyles(chip: string | null): string {
  const bar = '[data-xeno-pill="bar"]'
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace'
  const system = '-apple-system, system-ui, "Helvetica Neue", sans-serif'
  const rules = [
    `${bar} { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 8px !important; }`,
    // Inside the bar only icons, words and the circles: Orca fills its buttons and the active tab, and rules its rows.
    // (:where keeps this rule's weight that of "bar *", so the circles' colours below still win.)
    `${bar} *:where(:not([data-xeno-pill="state"], [data-xeno-pill="alert"])) { background-color: transparent !important; border-width: 0 !important; box-shadow: none !important; }`,
    `${bar} [data-xeno-pill="flat"] { display: contents !important; }`,
    `${bar} [data-xeno-pill="hide"], ${bar} [data-xeno-pill="state"] { display: none !important; }`,
    `${bar} [data-xeno-pill="lead"] { order: 1 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    `${bar} [data-xeno-pill="count"] { order: 2 !important; }`,
    `${bar} [data-xeno-pill="title"] { order: 3 !important; flex: 1 1 0px !important; min-width: 0 !important; max-width: none !important; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 8px !important; overflow: hidden !important; opacity: 1 !important; }`,
    `${bar} [data-xeno-pill="trail"] { order: 4 !important; flex: 0 0 auto !important; min-width: 0 !important; gap: 8px !important; margin: 0 !important; }`,
    `${bar} [data-xeno-pill="tblock"] { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 6px !important; flex: 0 1 auto !important; min-width: 0 !important; max-width: 100% !important; padding: 0 !important; min-height: 0 !important; }`,
    `${bar} [data-xeno-pill="tblock"] * { font-family: ${mono} !important; font-size: 13px !important; font-weight: 400 !important; color: rgba(205, 214, 244, 0.6) !important; text-align: left !important; }`,
    `${bar} [data-xeno-pill="ttext"] { flex: 0 1 auto !important; min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }`,
    `${bar} [data-xeno-pill="tmeta"] { display: flex !important; flex-direction: row !important; align-items: center !important; flex: 0 3 auto !important; min-width: 0 !important; gap: 0 !important; }`,
    `${bar} [data-xeno-pill="tmeta"]::before { content: "·"; margin-right: 6px; color: rgba(205, 214, 244, 0.45); }`,
    `${bar} [data-xeno-btn] { width: 26px !important; height: 26px !important; min-width: 26px !important; min-height: 26px !important; max-width: 26px !important; padding: 0 !important; margin: 0 !important; border-radius: 13px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex: 0 0 auto !important; }`,
    `${bar} [data-xeno-btn] * { min-width: 0 !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; color: ${INK} !important; font-family: ${system} !important; font-size: 12px !important; font-weight: 700 !important; }`,
    `${bar} [data-xeno-btn] svg { width: 15px !important; height: 15px !important; }`,
    `${bar} [data-xeno-btn] svg, ${bar} [data-xeno-btn] svg * { stroke: ${INK} !important; }`,
    `${bar} [data-xeno-btn="yellow"] { background-color: #f9e2af !important; }`,
    `${bar} [data-xeno-btn="green"] { background-color: #a6e3a1 !important; }`,
    `${bar} [data-xeno-btn="salmon"] { background-color: #f5a97f !important; }`,
    `${bar} [data-xeno-btn="blue"] { background-color: #8aadf4 !important; }`,
    // Back as Moshi's minimise: a dash in the yellow circle.
    `${bar} [data-xeno-btn="yellow"] > * { display: none !important; }`,
    `${bar} [data-xeno-btn="yellow"]::after { content: ""; width: 11px; height: 2.5px; border-radius: 2px; background: ${INK}; }`,
    // Another tab needs you: Orca's red dot, as a badge on the tabs circle.
    `${bar} [data-xeno-btn] [data-xeno-pill="alert"] { position: absolute !important; top: -2px !important; right: -2px !important; left: auto !important; width: 10px !important; height: 10px !important; border-radius: 5px !important; background-color: #f38ba8 !important; border: 1.5px solid ${INK} !important; }`
  ]
  if (chip) {
    rules.push(
      `${bar} [data-xeno-pill="title"]::after { content: ${cssString(chip)}; flex: 0 0 auto; margin-left: auto; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; height: 24px; line-height: 24px; padding: 0 10px; border-radius: 12px; background: #17463f; color: #5fe0c3; font: 600 12px ${system}; }`,
      // The desktop's connection, read from Orca's status dot: teal connected, amber on its way, red lost.
      `${bar}[data-xeno-conn="wait"] [data-xeno-pill="title"]::after { background: #4a3d16; color: #f9e2af; }`,
      `${bar}[data-xeno-conn="down"] [data-xeno-pill="title"]::after { background: #4d1f2a; color: #f38ba8; }`
    )
  }
  return rules.join('\n')
}
