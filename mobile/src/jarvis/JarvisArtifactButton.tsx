import { Pressable, Text } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import type { JarvisArtifact } from './jarvis-artifacts'
import { openInClaude } from './jarvis-open-in-claude'

// A Claude artifact an agent linked (a mockup, a report), opened in the Claude app on the phone.
export function JarvisArtifactButton({ artifact }: { readonly artifact: JarvisArtifact }) {
  const t = useMobileTranslation()
  const name = artifact.title ?? t('jarvis.screen.artifact', 'artifact')
  return (
    <Pressable
      onPress={() => openInClaude(artifact.url)}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.button, pressed && pressedStyle]}
      accessibilityRole="link"
      accessibilityLabel={t('jarvis.screen.openArtifact', 'Open {{name}} in Claude', { name })}
    >
      <Sparkles size={14} color={colors.accentBlue} />
      <Text style={styles.label} numberOfLines={1}>
        {t('jarvis.screen.openInClaude', 'Open in Claude')}
      </Text>
    </Pressable>
  )
}

const styles = themedStyleSheet(() => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.bgPanel
  },
  label: { color: colors.accentBlue, fontSize: typography.metaSize, fontWeight: '600' }
}))
