import { Text, View } from 'react-native'
import { TopSafeAreaView } from '../layout/top-safe-area-view'
import { hostScreenStyles as styles } from './host-screen-styles'
import { HostScreenHeader } from './host-screen-header'
import { HostScreenOverlays } from './host-screen-overlays'
import { HostWorkspaceList } from './host-workspace-list'
import type { HostScreenController } from './use-host-screen-controller'

export function HostScreenView({ controller }: { controller: HostScreenController }) {
  if (controller.state.error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{controller.state.error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TopSafeAreaView style={styles.topChromeSafeArea}>
        <HostScreenHeader controller={controller} />
      </TopSafeAreaView>
      <HostWorkspaceList controller={controller} />
      <HostScreenOverlays controller={controller} />
    </View>
  )
}
