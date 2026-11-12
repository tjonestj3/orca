import { Laptop } from 'lucide-react-native'
import { ActionSheetModal } from '../components/ActionSheetModal'
import type { HostProfile } from '../host-catalog/host-profile'
import { useMobileTranslation } from '../i18n/use-mobile-translation'

type Props = {
  readonly visible: boolean
  // The paired desktops whose Xeno answers.
  readonly hosts: readonly HostProfile[]
  readonly onPick: (hostId: string) => void
  readonly onClose: () => void
}

// Asked once, when several desktops run Xeno and none was picked yet. The pick is remembered.
export function JarvisHostPicker({ visible, hosts, onPick, onClose }: Props) {
  const t = useMobileTranslation()
  return (
    <ActionSheetModal
      visible={visible}
      title={t('jarvis.picker.title', 'Talk to Xeno on…')}
      onClose={onClose}
      actions={hosts.map((host) => ({
        id: host.id,
        label: host.name,
        icon: Laptop,
        closeBeforePress: true,
        onPress: () => onPick(host.id)
      }))}
    />
  )
}
