import { Pressable, Text, View } from 'react-native'
import { Mic, Play, Wrench } from 'lucide-react-native'
import { MobileMarkdown } from '../components/MobileMarkdown'
import type { Translate } from '../i18n/mobile-i18n'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import type { TranscriptEntry } from './jarvis-transcript'

type Props = {
  readonly entry: TranscriptEntry
  readonly enabled: boolean
  readonly copied: boolean
  readonly t: Translate
  readonly onReplay: (id: number) => void
  readonly onCopy: (entry: TranscriptEntry) => void
}

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// One line of the conversation, drawn the way Orca's own Claude chat draws it: your messages in a bubble on the
// right, Xeno's answers as plain text across the page, tools as quiet one-line rows.
export function JarvisTranscriptRow({ entry, enabled, copied, t, onReplay, onCopy }: Props) {
  const time = entry.showTime ? <Text style={styles.time}>{timeOf(entry.at)}</Text> : null
  const copiedNote = copied ? (
    <Text style={styles.copied}>{t('jarvis.transcript.copied', 'Copied')}</Text>
  ) : null

  if (entry.who === 'new') {
    return (
      <View style={styles.entry}>
        {time}
        <View style={styles.divider} accessibilityRole="text">
          <View style={styles.rule} />
          <Text style={styles.dividerText}>
            {t('jarvis.transcript.newConversation', 'New conversation')}
          </Text>
          <View style={styles.rule} />
        </View>
      </View>
    )
  }

  if (entry.who === 'tool') {
    return (
      <View style={styles.toolRow} accessibilityRole="text">
        <Wrench size={13} color={colors.textMuted} />
        <Text style={styles.toolText} numberOfLines={1}>
          {entry.text}
        </Text>
      </View>
    )
  }

  if (entry.who === 'you') {
    return (
      <View style={styles.entry}>
        {time}
        <Pressable
          onLongPress={() => onCopy(entry)}
          disabled={entry.pending}
          style={({ pressed }) => [
            styles.bubble,
            entry.pending && styles.pending,
            pressed && pressedStyle
          ]}
          accessibilityRole="text"
          accessibilityLabel={`${t('jarvis.transcript.you', 'You')}: ${entry.text}`}
          accessibilityHint={t('jarvis.transcript.copyHint', 'Touch and hold to copy.')}
        >
          <View style={styles.yourLine}>
            {entry.spoken ? <Mic size={13} color={colors.textMuted} style={styles.mic} /> : null}
            <Text style={styles.yourText}>{entry.text}</Text>
          </View>
          {copiedNote}
        </Pressable>
      </View>
    )
  }

  const update = entry.who === 'update'
  const label = update
    ? t('jarvis.transcript.agentUpdate', 'Agent update')
    : t('jarvis.transcript.jarvis', 'Xeno')
  const playable = entry.playable && enabled && entry.id != null
  return (
    <View style={styles.entry}>
      {time}
      <Pressable
        onPress={playable ? () => onReplay(entry.id as number) : undefined}
        onLongPress={() => onCopy(entry)}
        style={({ pressed }) => [styles.theirs, update && styles.update, pressed && pressedStyle]}
        accessibilityRole={entry.playable ? 'button' : 'text'}
        accessibilityLabel={`${label}: ${entry.text}`}
        accessibilityHint={
          entry.playable
            ? t('jarvis.transcript.playHint', 'Plays it again. Touch and hold to copy.')
            : t('jarvis.transcript.copyHint', 'Touch and hold to copy.')
        }
      >
        <View style={styles.meta}>
          <Text style={[styles.label, update && styles.updateLabel]}>{label}</Text>
          {entry.playable ? <Play size={12} color={colors.textSecondary} /> : null}
        </View>
        {entry.markdown || entry.growing ? (
          <MobileMarkdown
            content={entry.text}
            fallback="…"
            growing={entry.growing}
            streaming={entry.growing}
            chatMath
          />
        ) : (
          <Text style={styles.theirText}>{entry.text}</Text>
        )}
        {copiedNote}
      </Pressable>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  entry: { gap: spacing.xs },
  time: {
    alignSelf: 'center',
    color: colors.textSecondary,
    fontSize: typography.metaSize,
    paddingVertical: spacing.xs
  },
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: colors.chatUserSurface,
    borderWidth: 1,
    borderColor: colors.chatUserBorder,
    borderRadius: radii.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs
  },
  pending: { opacity: 0.6 },
  yourLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  mic: { marginTop: 4 },
  yourText: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    lineHeight: 22
  },
  theirs: { alignSelf: 'stretch', gap: spacing.xs, paddingVertical: 2 },
  update: {
    borderLeftWidth: 2,
    borderLeftColor: colors.statusAmber,
    paddingLeft: spacing.sm
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: typography.metaSize, fontWeight: '600' },
  updateLabel: { color: colors.statusAmber },
  theirText: { color: colors.textPrimary, fontSize: typography.bodySize, lineHeight: 22 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  toolText: { flexShrink: 1, color: colors.textMuted, fontSize: typography.metaSize },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  dividerText: { color: colors.textMuted, fontSize: typography.metaSize },
  copied: { color: colors.textSecondary, fontSize: typography.metaSize }
}))
