import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useReducedMotionEnabled } from '../platform/accessibility/use-reduced-motion'
import { colors } from '../theme/mobile-theme'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisPhase } from './jarvis-call-state'

type Props = {
  readonly phase: JarvisPhase
  /** The voice level the core swells with, 0 to 1: Xeno's while it speaks, yours while it hears you. */
  readonly level: number
  readonly size: number
  /** Settings' preview: it moves even through "idle". */
  readonly demo?: boolean
}

// Blue while Xeno waits or talks, purple while it's hearing you (however you got its attention), amber while it
// thinks.
function phaseColor(phase: JarvisPhase): string {
  switch (phase) {
    case 'hearing':
      return colors.statusPurple
    case 'thinking':
      return colors.statusAmber
    case 'error':
      return colors.statusRed
    case 'idle':
      return colors.textSecondary
    case 'connecting':
    case 'listening':
    case 'speaking':
      return colors.accentBlue
  }
}

function useSpin(durationMs: number, still: boolean): Animated.Value {
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) {
      return
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true
      })
    )
    loop.start()
    return () => loop.stop()
  }, [durationMs, still, spin])
  return spin
}

const turn = (spin: Animated.Value, reverse = false) => ({
  transform: [
    {
      rotate: spin.interpolate({
        inputRange: [0, 1],
        outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg']
      })
    }
  ]
})

// The Classic orb theme: rings that turn, an amber sweep while thinking, a core that swells with whoever is talking.
export function JarvisClassicOrb({ phase, level, size, demo = false }: Props) {
  useMobileColorScheme()
  // With no call the rings hold still: a still orb reads as off (Settings' preview, demo, always moves).
  const still = useReducedMotionEnabled() !== false || (phase === 'idle' && !demo)
  const outer = useSpin(26_000, still)
  const inner = useSpin(9_000, still)
  const sweep = useSpin(2_200, still)
  const swell = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(swell, {
      toValue: still ? 0 : level,
      duration: 90,
      useNativeDriver: true
    }).start()
  }, [level, still, swell])

  const color = phaseColor(phase)
  const resting = phase === 'idle' || phase === 'error'
  const c = size / 2
  const ring = (fraction: number) => size * fraction
  const circumference = (fraction: number) => 2 * Math.PI * ring(fraction)
  const core = size * 0.5

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="jarvisOrbHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={resting ? 0.12 : 0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#jarvisOrbHalo)" />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, turn(outer)]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={ring(0.46)}
            stroke={color}
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="1.5 7"
            fill="none"
          />
          <Circle
            cx={c}
            cy={c}
            r={ring(0.41)}
            stroke={color}
            strokeOpacity={resting ? 0.25 : 0.55}
            strokeWidth={2}
            strokeDasharray={`${circumference(0.41) / 3 - 18} 18`}
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, turn(inner, true)]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={ring(0.32)}
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={1}
            fill="none"
          />
          <Circle
            cx={c}
            cy={c}
            r={ring(0.32)}
            stroke={color}
            strokeOpacity={resting ? 0.4 : 0.9}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`10 ${circumference(0.32) / 3 - 10}`}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {phase === 'thinking' || phase === 'connecting' ? (
        <Animated.View style={[StyleSheet.absoluteFill, turn(sweep)]}>
          <Svg width={size} height={size}>
            <Circle
              cx={c}
              cy={c}
              r={ring(0.37)}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${circumference(0.37) * 0.14} ${circumference(0.37)}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.center,
          {
            opacity: swell,
            transform: [
              { scale: swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }
            ]
          }
        ]}
      >
        <Svg width={core} height={core}>
          <Circle
            cx={core / 2}
            cy={core / 2}
            r={core / 2 - 2}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={2}
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.center,
          {
            transform: [
              { scale: swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }
            ]
          }
        ]}
      >
        <Svg width={core} height={core}>
          <Defs>
            <RadialGradient id="jarvisOrbCore" cx="42%" cy="36%" r="62%">
              <Stop offset="0" stopColor={colors.onAccent} stopOpacity={resting ? 0.5 : 0.95} />
              <Stop offset="0.35" stopColor={color} stopOpacity={resting ? 0.45 : 0.8} />
              <Stop offset="1" stopColor={color} stopOpacity={0.06} />
            </RadialGradient>
          </Defs>
          <Circle cx={core / 2} cy={core / 2} r={core / 2 - 2} fill="url(#jarvisOrbCore)" />
          <Circle
            cx={core / 2}
            cy={core / 2}
            r={core / 2 - 2}
            stroke={color}
            strokeOpacity={resting ? 0.35 : 0.75}
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' }
})
