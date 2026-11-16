import { useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisMessage } from './jarvis-history'
import { transcriptEntries, type TranscriptEntry } from './jarvis-transcript'
import { JarvisTranscriptRow } from './JarvisTranscriptRow'

const COPIED_MS = 1500

type Props = {
  readonly messages: readonly JarvisMessage[]
  // What Jarvis is hearing right now, shown as your next line until the server keeps it.
  readonly hearing: string
  readonly enabled: boolean
  // Xeno is answering a turn right now; shown under the last line until its reply starts to appear.
  readonly working?: boolean
  readonly onReplay: (id: number) => void
}

// The conversation with Xeno as a chat, newest at the bottom: yours on the right, Xeno's across the page.
// Tap one of Xeno's to hear it again; touch and hold any to copy it.
export function JarvisTranscript({ messages, hearing, enabled, working = false, onReplay }: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const scroller = useRef<ScrollView>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const entries = transcriptEntries(messages, hearing)
  const writing = entries.at(-1)?.growing === true

  const copy = (entry: TranscriptEntry): void => {
    void Clipboard.setStringAsync(entry.text).then(() => {
      setCopied(entry.key)
      setTimeout(() => setCopied((key) => (key === entry.key ? null : key)), COPIED_MS)
    })
  }

  if (entries.length === 0 && !working) {
    return (
      <Text style={styles.empty}>
        {t('jarvis.transcript.empty', 'Your conversation with Xeno shows up here.')}
      </Text>
    )
  }

  return (
    <ScrollView
      ref={scroller}
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      // Opens at the newest line and follows the conversation as it goes.
      onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
    >
      {entries.map((entry) => (
        <JarvisTranscriptRow
          key={entry.key}
          entry={entry}
          enabled={enabled}
          copied={copied === entry.key}
          t={t}
          onReplay={onReplay}
          onCopy={copy}
        />
      ))}
      {working && !writing ? (
        <View style={styles.working} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={styles.workingText}>{t('jarvis.chat.working', 'Xeno is working…')}</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = themedStyleSheet(() => ({
  list: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  empty: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  working: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  workingText: { color: colors.textMuted, fontSize: typography.metaSize }
}))
