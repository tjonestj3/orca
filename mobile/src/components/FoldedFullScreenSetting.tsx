import { ListRow } from './list/ListGroup'
import { MobileSwitch } from './MobileSwitch'
import { SettingsSection } from '../settings/settings-screen-frame'
import { foldedFullScreen, useFoldedFullScreenDefault } from '../layout/folded-full-screen'
import { useSideColumn } from '../layout/side-rail'
import { useMobileTranslation } from '../i18n/use-mobile-translation'

/** The default for the session header's full-screen button, on an iPhone Duo. */
export function FoldedFullScreenSetting() {
  const t = useMobileTranslation()
  const on = useFoldedFullScreenDefault()
  if (useSideColumn() === null) {
    return null
  }
  const title = t('components.foldedFullScreen.title', 'Full screen when folded')
  return (
    <SettingsSection title={t('components.foldedFullScreen.section', 'SIDE COLUMN')}>
      <ListRow
        title={title}
        subtitle={t(
          'components.foldedFullScreen.description',
          'Sessions use the whole cover screen and the keys move to the bottom row. The button beside ⋯ in a session switches it for now.'
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
