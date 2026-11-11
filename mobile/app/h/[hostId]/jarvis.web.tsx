import CatchAllPageRoute from '../../../src/mobile-web-shell/catch-all-page-route'

// Native-only: the page hands this path to native, where the call and microphone live.
// Own component, not a re-export: an identical re-export compiles to the same asset as [...page] and duplicates it in the manifest.
export default function JarvisPageRoute() {
  return <CatchAllPageRoute />
}
