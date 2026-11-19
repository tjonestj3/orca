import { useState } from 'react'
import { Image, Modal, Pressable, View } from 'react-native'
import { ImageOff } from 'lucide-react-native'
import type { Translate } from '../i18n/mobile-i18n'
import { colors, pressedStyle, radii, spacing } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { xenoKeys } from './jarvis-key'

type Props = {
  readonly ids: readonly string[]
  // Where Xeno serves an image; without it (or for a bad id) the image shows as a placeholder.
  readonly imageUrl?: (id: string) => string | null
  readonly t: Translate
}

// The images you sent Xeno, as thumbnails in your message; tap one to see it full screen. They load from the
// desktop with the phone's key, so they show over home Wi-Fi too.
export function JarvisImageThumbs({ ids, imageUrl, t }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const source = (id: string) => {
    const uri = imageUrl?.(id)
    return uri ? { uri, headers: xenoKeys.headers() } : null
  }
  const shown = open ? source(open) : null

  return (
    <View style={styles.row}>
      {ids.map((id) => {
        const image = source(id)
        return image ? (
          <Pressable
            key={id}
            onPress={() => setOpen(id)}
            style={({ pressed }) => pressed && pressedStyle}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('jarvis.transcript.openImage', 'Open image')}
          >
            <Image source={image} style={styles.thumb} accessibilityIgnoresInvertColors />
          </Pressable>
        ) : (
          <View key={id} style={[styles.thumb, styles.missing]}>
            <ImageOff size={18} color={colors.textMuted} />
          </View>
        )
      })}
      <Modal
        visible={shown != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <Pressable
          style={styles.viewer}
          onPress={() => setOpen(null)}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.transcript.closeImage', 'Close image')}
        >
          {shown ? (
            <Image
              source={shown}
              style={styles.full}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.xs },
  thumb: { width: 120, height: 120, borderRadius: radii.control, backgroundColor: colors.bgRaised },
  missing: { alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)', justifyContent: 'center' },
  full: { width: '100%', height: '100%' }
}))
