import type { ComponentType, Ref } from 'react'
import { Pressable, type HostInstance } from 'react-native'
import { colors, feedback, radii } from '../../theme/mobile-theme'
import { themedStyleSheet } from '../../theme/themed-styles'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

export const NAV_BAR_BUTTON_SIZE = 36
const COMPACT_SIZE = 28 // COLUMN_TOGGLE_BUTTON fits it under the folded Duo's camera

type IconProps = { size?: number; color?: string; strokeWidth?: number }

type NavBarButtonProps = {
  ref?: Ref<HostInstance>
  icon: ComponentType<IconProps>
  accessibilityLabel: string
  onPress: () => void
  /** The screen or panel this button opens is showing. */
  active?: boolean
  disabled?: boolean
  /** The icon's colour while not active, e.g. a PR state's. */
  iconColor?: string
  /** A smaller button for a tight spot, e.g. under the folded Duo's camera; it takes taps as far out as a full one. */
  compact?: boolean
}

// A round top-bar button; the bar floats over content like the composer, so its buttons are round too.
export function NavBarButton({
  ref,
  icon: Icon,
  accessibilityLabel,
  onPress,
  active = false,
  disabled = false,
  iconColor,
  compact = false
}: NavBarButtonProps) {
  useMobileColorScheme()
  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        active && styles.active,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={compact ? 4 + (NAV_BAR_BUTTON_SIZE - COMPACT_SIZE) / 2 : 4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
    >
      <Icon
        size={compact ? 15 : 18}
        color={active ? colors.bgBase : (iconColor ?? colors.textPrimary)}
        strokeWidth={2.1}
      />
    </Pressable>
  )
}

const styles = themedStyleSheet(() => ({
  button: {
    width: NAV_BAR_BUTTON_SIZE,
    height: NAV_BAR_BUTTON_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised
  },
  compact: {
    width: COMPACT_SIZE,
    height: COMPACT_SIZE
  },
  active: {
    backgroundColor: colors.surfaceBright
  },
  pressed: {
    opacity: feedback.pressedOpacity
  },
  disabled: {
    opacity: feedback.disabledOpacity
  }
}))
