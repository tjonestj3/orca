import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Play } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisMessage } from './jarvis-history'
import { transcriptEntries, type TranscriptEntry } from './jarvis-transcript'

const COPIED_MS = 1500

type Props = {
  readonly messages: readonly JarvisMessage[]
  // What Jarvis is hearing right now, shown as your next line until the server keeps it.
  readonly hearing: string
  readonly enabled: boolean
  readonly onReplay: (id: number) => void
}

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// The conversation with Jarvis as chat bubbles, newest at the bottom: yours on the right, Jarvis's on the left.
// Tap one of Jarvis's to hear it again; touch and hold any to copy it.
export function JarvisTranscript({ messages, hearing, enabled, onReplay }: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const scroller = useRef<ScrollView>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const entries = transcriptEntries(messages, hearing)

  const copy = (entry: TranscriptEntry): void => {
    void Clipboard.setStringAsync(entry.text).then(() => {
      setCopied(entry.key)
      setTimeout(() => setCopied((key) => (key === entry.key ? null : key)), COPIED_MS)
    })
  }

  if (entries.length === 0) {
    return (
      <Text style={styles.empty}>
        {t('jarvis.transcript.empty', 'Your conversation with Jarvis shows up here.')}
      </Text>
    )
  }

  return (
    <ScrollView
      ref={scroller}
      style={styles.list}
      contentContainerStyle={styles.content}
      // Opens at the newest line and follows the conversation as it goes.
      onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
    >
      {entries.map((entry) => {
        const { id } = entry
        const yours = entry.who === 'you'
        const label =
          entry.who === 'update'
            ? t('jarvis.transcript.agentUpdate', 'Agent update')
            : yours
              ? t('jarvis.transcript.you', 'You')
              : t('jarvis.transcript.jarvis', 'Jarvis')
        return (
          <View key={entry.key} style={styles.entry}>
            {entry.showTime ? <Text style={styles.time}>{timeOf(entry.at)}</Text> : null}
            <Pressable
              onPress={entry.playable && enabled && id != null ? () => onReplay(id) : undefined}
              onLongPress={() => copy(entry)}
              disabled={entry.pending}
              style={({ pressed }) => [
                styles.bubble,
                yours ? styles.yours : styles.theirs,
                entry.pending && styles.pending,
                pressed && pressedStyle
              ]}
              accessibilityRole={entry.playable ? 'button' : 'text'}
              accessibilityLabel={`${label}: ${entry.text}`}
              accessibilityHint={
                entry.playable
                  ? t('jarvis.transcript.playHint', 'Plays it again. Touch and hold to copy.')
                  : t('jarvis.transcript.copyHint', 'Touch and hold to copy.')
              }
            >
              {yours ? null : (
                <View style={styles.meta}>
                  <Text style={[styles.label, entry.who === 'update' && styles.updateLabel]}>
                    {label}
                  </Text>
                  {entry.playable ? <Play size={12} color={colors.textSecondary} /> : null}
                </View>
              )}
              <Text style={yours ? styles.yourText : styles.theirText}>{entry.text}</Text>
              {copied === entry.key ? (
                <Text style={yours ? styles.yourCopied : styles.copied}>
                  {t('jarvis.transcript.copied', 'Copied')}
                </Text>
              ) : null}
            </Pressable>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = themedStyleSheet(() => ({
  list: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  entry: { gap: spacing.xs },
  time: {
    alignSelf: 'center',
    color: colors.textSecondary,
    fontSize: typography.metaSize,
    paddingVertical: spacing.xs
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.surface,
    gap: spacing.xs
  },
  yours: { alignSelf: 'flex-end', backgroundColor: colors.accentBlue },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.bgRaised },
  pending: { opacity: 0.6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: typography.metaSize, fontWeight: '600' },
  updateLabel: { color: colors.statusAmber },
  yourText: { color: colors.onAccent, fontSize: typography.bodySize, lineHeight: 21 },
  theirText: { color: colors.textPrimary, fontSize: typography.bodySize, lineHeight: 21 },
  copied: { color: colors.textSecondary, fontSize: typography.metaSize },
  yourCopied: { color: colors.onAccent, fontSize: typography.metaSize, opacity: 0.8 }
}))
