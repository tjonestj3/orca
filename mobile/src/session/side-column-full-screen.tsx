import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react-native'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { foldedFullScreen } from '../layout/folded-full-screen'
import { useSideColumn, useSideColumnFullScreen } from '../layout/side-rail'
import { useMobileTranslation } from '../i18n/use-mobile-translation'

/** While this session screen is the one showing, it may take the folded Duo's status column. */
export function useSessionFullScreen(): void {
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, [])
  )
  useSideColumnFullScreen(focused)
}

/**
 * The session header's button for the folded Duo: full screen, with the keys in the bottom row, or
 * the status column back with the keys and Xeno in it. Settings → Terminal sets which it starts as.
 */
export function SideColumnToggle() {
  const t = useMobileTranslation()
  const column = useSideColumn()
  if (!column) {
    return null
  }
  const icon =
    column.side === 'right'
      ? column.extended
        ? PanelRightOpen
        : PanelRightClose
      : column.extended
        ? PanelLeftOpen
        : PanelLeftClose
  return (
    <NavBarButton
      icon={icon}
      accessibilityLabel={
        column.extended
          ? t('session.header.showSideColumn', 'Show the side keys')
          : t('session.header.fullScreen', 'Full screen')
      }
      onPress={() => foldedFullScreen.toggle()}
    />
  )
}
