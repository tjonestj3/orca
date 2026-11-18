import { useWindowDimensions } from 'react-native'
import { ListRow } from './list/ListGroup'
import { MobileSwitch } from './MobileSwitch'
import { SettingsSection } from '../settings/settings-screen-frame'
import { foldedFullScreen, useFoldedFullScreenDefault } from '../layout/folded-full-screen'
import { useSideColumn } from '../layout/side-rail'
import { useReservedRegions } from '../layout/reserved-regions'
import { useMobileTranslation } from '../i18n/use-mobile-translation'

/** The default for the session header's full-screen button, on an iPhone Duo. */
export function FoldedFullScreenSetting() {
  const t = useMobileTranslation()
  const on = useFoldedFullScreenDefault()
  const column = useSideColumn()
  const { width, height } = useWindowDimensions()
  const { hasFoldDivision } = useReservedRegions()
  if (column === null) {
    return null
  }
  // What the phone reports, so a screenshot says why the session screens look as they do.
  const reported = `Screen ${Math.round(width)} × ${Math.round(height)} pt · status column on the ${column.side}, ${Math.round(column.width)} pt · fold ${hasFoldDivision ? 'reported' : 'not reported'}`
  const title = t('components.foldedFullScreen.title', 'Full screen when folded')
  return (
    <SettingsSection
      title={t('components.foldedFullScreen.section', 'SIDE COLUMN')}
      footer={reported}
    >
      <ListRow
        title={title}
        subtitle={t(
          'components.foldedFullScreen.description',
          'Sessions and the Xeno chat use the whole cover screen, and the keys move to the bottom row. The panel button at the top switches it for now.'
        )}
        accessory={
          <MobileSwitch
            accessibilityLabel={title}
            value={on}
            onValueChange={(next) => void foldedFullScreen.setDefault(next)}
          />
        }
      />
    </SettingsSection>
  )
}
