import {
  parseMobileWebShellLoadState,
  type MobileWebShellFailureReason
} from '../../modules/orca-mobile-web-shell/src/load-state'

/** The page view's load events, as the shell's reports: a failure, a document starting, its response committed. */
export function onShellLoadState(report: {
  readonly failure: (reason: MobileWebShellFailureReason, reclaimed: boolean) => void
  readonly started: () => void
  readonly loaded: () => void
}): (event: { readonly nativeEvent: unknown }) => void {
  return (event) => {
    const parsed = parseMobileWebShellLoadState(event.nativeEvent)
    if (parsed?.state === 'failed') {
      report.failure(parsed.reason, parsed.reclaimed === true)
    } else if (parsed?.state === 'ready') {
      // Load completion proves only response commit; start waiting for the page’s own first paint here.
      report.loaded()
    } else if (parsed?.state === 'loading') {
      // Cover on load start: the old document remains visible until the new one paints, before ready arrives.
      report.started()
    }
  }
}
