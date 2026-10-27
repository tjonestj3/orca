import { Stack } from 'expo-router'
import { colors } from '../theme/mobile-theme'
import { HOST_STACK_SCREENS, type HostStackAnimation } from './host-stack-screens'

export function HostStack({
  animation,
  swipeBack = true
}: {
  animation: HostStackAnimation
  /** Off beside a visible sidebar, whose resize drag starts at the detail's left edge. */
  swipeBack?: boolean
}) {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        // Swap tablet detail panes instantly so slides cannot reveal the outgoing pane’s underlying screen; phones retain native slides.
        animation,
        gestureEnabled: swipeBack
      }}
    >
      {HOST_STACK_SCREENS.map(({ name, title }) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </Stack>
  )
}
