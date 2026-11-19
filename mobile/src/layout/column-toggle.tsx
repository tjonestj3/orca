import { StyleSheet, View } from 'react-native'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react-native'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { COLUMN_TOGGLE_SLOT, foldedFullScreen } from './folded-full-screen'

export function columnToggleIcon(side: 'left' | 'right', extended: boolean) {
  if (side === 'right') {
    return extended ? PanelRightOpen : PanelRightClose
  }
  return extended ? PanelLeftOpen : PanelLeftClose
}

/** Full screen, or the status column back with the keys and Xeno in it. */
export function ColumnToggleButton({
  side,
  extended
}: {
  side: 'left' | 'right'
  extended: boolean
}) {
  const t = useMobileTranslation()
  return (
    <NavBarButton
      icon={columnToggleIcon(side, extended)}
      accessibilityLabel={
        extended
          ? t('session.header.showSideColumn', 'Show the side keys')
          : t('session.header.fullScreen', 'Full screen')
      }
      onPress={() => foldedFullScreen.toggle()}
    />
  )
}

/** The toggle drawn in the column itself, for a screen whose header the app doesn't draw. */
export function ColumnToggle({
  slot,
  extended
}: {
  slot: { side: 'left' | 'right'; width: number; top: number }
  extended: boolean
}) {
  return (
    <View
      style={[
        styles.slot,
        { top: slot.top, width: slot.width },
        slot.side === 'right' ? { right: 0 } : { left: 0 }
      ]}
    >
      <ColumnToggleButton side={slot.side} extended={extended} />
    </View>
  )
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', height: COLUMN_TOGGLE_SLOT, alignItems: 'center' }
})
