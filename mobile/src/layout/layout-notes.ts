/**
 * Layout notes for Xeno's server log, to see why a page came out narrow after unfolding and folding the iPhone
 * Duo (Nov 20: a band left empty on the right, as wide as the unfolded panes' leftover). The layout's own numbers
 * (window, fold, status column, panes, the page's frame) are noted as they change; JarvisProvider sends each to
 * the server while a call is live, and the last few when a call starts, so a fold just before calling is in too.
 */
export type LayoutNote = { readonly kind: string; readonly [detail: string]: unknown }

const KEEP = 24
const kept: LayoutNote[] = []
const listeners = new Set<(note: LayoutNote) => void>()
const lastByKind = new Map<string, string>()

/** Notes `kind` with these details, if they changed since its last note. */
export function noteLayout(kind: string, details: Record<string, unknown>): void {
  const key = JSON.stringify(details)
  if (lastByKind.get(kind) === key) {
    return
  }
  lastByKind.set(kind, key)
  const note = { kind: `layout-${kind}`, at: Date.now(), ...details }
  kept.push(note)
  if (kept.length > KEEP) {
    kept.shift()
  }
  listeners.forEach((listener) => listener(note))
}

/** Each note as it comes, after the ones kept so far. */
export function subscribeLayoutNotes(listener: (note: LayoutNote) => void): () => void {
  kept.forEach(listener)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** A rectangle as a short "x,y w×h" in whole points. */
export function rect(
  r: { x: number; y: number; width: number; height: number } | null | undefined
): string {
  return r
    ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`
    : 'none'
}
