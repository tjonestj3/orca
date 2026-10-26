import { useMemo, type ComponentType } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Folder, GitBranch, List, Monitor, Settings } from 'lucide-react-native'
import { leaveHostRoute } from '../host-route-exit'
import { colors, radii, spacing } from '../theme/mobile-theme'
import { useSideRailContent } from './side-rail'

const BUTTON_HEIGHT = 44

type NavButton = {
  id: string
  label: string
  Icon: ComponentType<{ size: number; color: string }>
  onPress: () => void
}

/**
 * Navigation in the side strip for a host's screens, such as the iPhone Duo's status column when
 * folded. Native only, so it works against any desktop; a screen with its own rail (the terminal
 * keys) draws over it while on screen.
 */
export function useHostSideNavRail(hostId: string | undefined, worktreeId: string | undefined) {
  // The global router, read only on press: the rail renders above any one screen's navigator.
  const node = useMemo(() => {
    if (!hostId) {
      return null
    }
    const buttons: NavButton[] = [
      {
        id: 'back',
        label: 'Back',
        Icon: ChevronLeft,
        onPress: () => {
          if (router.canGoBack()) {
            router.back()
          }
        }
      },
      {
        id: 'workspaces',
        label: 'Workspaces',
        Icon: List,
        onPress: () => router.dismissTo({ pathname: '/h/[hostId]', params: { hostId } })
      },
      ...(worktreeId
        ? [
            {
              id: 'files',
              label: 'Files',
              Icon: Folder,
              onPress: () =>
                router.push({
                  pathname: '/h/[hostId]/files/[worktreeId]',
                  params: { hostId, worktreeId }
                })
            },
            {
              id: 'source-control',
              label: 'Source control',
              Icon: GitBranch,
              onPress: () =>
                router.push({
                  pathname: '/h/[hostId]/source-control/[worktreeId]',
                  params: { hostId, worktreeId }
                })
            }
          ]
        : []),
      { id: 'computers', label: 'Computers', Icon: Monitor, onPress: () => leaveHostRoute(router) },
      { id: 'settings', label: 'Settings', Icon: Settings, onPress: () => router.push('/settings') }
    ]
    return (
      <View style={styles.rail}>
        {buttons.map(({ id, label, Icon, onPress }) => (
          <Pressable
            key={id}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Icon size={20} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    )
  }, [hostId, worktreeId])
  useSideRailContent(node)
}

const styles = StyleSheet.create({
  rail: {
    flex: 1,
    alignItems: 'stretch',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  button: {
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
    backgroundColor: colors.bgRaised
  },
  buttonPressed: {
    backgroundColor: colors.borderSubtle
  }
})
