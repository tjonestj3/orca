import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useReducedMotionEnabled } from '../platform/accessibility/use-reduced-motion'
import { orbPageHtml } from './orb-themes/orb-page-html'
import type { OrbState } from './orb-themes/orb-themes'

type Props = {
  /** The theme's drawing (orb-themes). */
  readonly drawing: string
  readonly state: OrbState
  /** The voice level, 0 to 1; ignored while `demo` simulates one. */
  readonly level: number
  readonly size: number
  /** Settings' preview: the page makes up a voice rather than wait for one. */
  readonly demo?: boolean
}

// How much the level must move before it's sent: the page smooths it anyway, and each send runs script in the page.
const LEVEL_STEP = 0.03

/**
 * An orb theme drawn on a canvas, in a small transparent web view the size of the orb (orb-themes/orb-page-core):
 * the app has no canvas of its own, and the themes are canvas drawings. The view takes no touches, so the press
 * goes to whatever holds the orb (hold to talk, tap to open), as with the Classic orb.
 */
export function JarvisThemedOrb({ drawing, state, level, size, demo = false }: Props) {
  const view = useRef<WebView>(null)
  const reduce = useReducedMotionEnabled() === true
  const source = useMemo(() => ({ html: orbPageHtml(drawing) }), [drawing])
  const sent = useRef(-1)
  const tell = (next: object) =>
    view.current?.injectJavaScript(
      `window.__orb && window.__orb.set(${JSON.stringify(next)});true;`
    )
  const settings = () => tell({ state, demo, reduce, level })
  useEffect(settings, [state, demo, reduce])
  useEffect(() => {
    if (Math.abs(level - sent.current) >= LEVEL_STEP || (level === 0 && sent.current !== 0)) {
      sent.current = level
      tell({ level })
    }
  }, [level])
  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <WebView
        ref={view}
        source={source}
        style={styles.page}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        // Its first frame comes with the state it should show.
        onLoadEnd={settings}
      />
    </View>
  )
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: 'transparent' } })
