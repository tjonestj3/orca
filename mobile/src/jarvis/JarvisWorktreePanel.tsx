import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronRight, MessageCircle, Send, SquareArrowOutUpRight } from 'lucide-react-native'
import { ActionSheetModal } from '../components/ActionSheetModal'
import { MobileSegmentedControl } from '../components/MobileSegmentedControl'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { askForUpdate, askToSendMessage, askToTalkAbout } from './jarvis-asks'
import { JarvisArtifactButton } from './JarvisArtifactButton'
import type { JarvisWorktreeCard } from './jarvis-call-state'
import type { JarvisMessage } from './jarvis-history'
import type { JarvisWorktree } from './jarvis-worktrees'
import { JarvisTranscript } from './JarvisTranscript'

type Translate = ReturnType<typeof useMobileTranslation>

type Props = {
  readonly cards: readonly JarvisWorktreeCard[]
  readonly worktrees: readonly JarvisWorktree[]
  // null until the first answer, false when the desktop's Jarvis can't be reached.
  readonly reachable: boolean | null
  readonly enabled: boolean
  readonly onAsk: (text: string) => void
  readonly onOpen: (worktreeId: string) => void
  // The conversation lately, oldest first; tapping one of Jarvis's lines plays it again.
  readonly messages: readonly JarvisMessage[]
  // What Jarvis is hearing right now, shown until the server keeps it.
  readonly hearing: string
  readonly onReplay: (id: number) => void
}

type Tab = 'worktrees' | 'conversation'

function stateColor(state: string): string {
  switch (state) {
    case 'needs you':
      return colors.statusAmber
    case 'working':
      return colors.accentBlue
    case 'done':
      return colors.statusGreen
    default:
      return colors.textSecondary
  }
}

function stateLabel(state: string, t: Translate): string {
  switch (state) {
    case 'needs you':
      return t('jarvis.worktree.needsYou', 'Needs you')
    case 'working':
      return t('jarvis.worktree.working', 'Working')
    case 'done':
      return t('jarvis.worktree.done', 'Done')
    default:
      return t('jarvis.worktree.idle', 'Idle')
  }
}

// Cards for the worktrees in the conversation (tap to open in Orca), then every active worktree:
// tap for Jarvis's spoken update, touch and hold to talk about it, send its agent a message or open it.
// The Conversation tab is the chat with Jarvis, newest at the bottom: tap one of Jarvis's lines to hear it again.
export function JarvisWorktreePanel({
  cards,
  worktrees,
  reachable,
  enabled,
  onAsk,
  onOpen,
  messages,
  hearing,
  onReplay
}: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const [held, setHeld] = useState<JarvisWorktree | null>(null)
  const [tab, setTab] = useState<Tab>('worktrees')

  return (
    <>
      {cards.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardsScroller}
          contentContainerStyle={styles.cards}
        >
          {cards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => onOpen(card.id)}
              style={({ pressed }) => [styles.card, pressed && pressedStyle]}
              accessibilityRole="button"
              accessibilityLabel={t('jarvis.screen.openWorktree', 'Open {{name}} in Orca', {
                name: card.name
              })}
            >
              <View style={[styles.dot, { backgroundColor: stateColor(card.state) }]} />
              <View style={styles.cardText}>
                <Text style={styles.name} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {card.isNew ? t('jarvis.screen.newWorktree', 'New') : stateLabel(card.state, t)}
                  {card.repo ? ` · ${card.repo}` : ''}
                </Text>
              </View>
              {card.artifacts[0] ? <JarvisArtifactButton artifact={card.artifacts[0]} /> : null}
              <SquareArrowOutUpRight size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <MobileSegmentedControl<Tab>
        style={styles.tabs}
        segments={[
          { value: 'worktrees', label: t('jarvis.screen.worktrees', 'Worktrees') },
          { value: 'conversation', label: t('jarvis.screen.conversation', 'Conversation') }
        ]}
        selected={tab}
        onSelect={setTab}
        testIDPrefix="jarvis-panel"
        fill
        tabs
      />
      {tab === 'conversation' ? (
        <JarvisTranscript
          messages={messages}
          hearing={hearing}
          enabled={enabled}
          onReplay={onReplay}
        />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {worktrees.length === 0 ? (
            <Text style={styles.empty}>
              {reachable === false
                ? t('jarvis.screen.listUnreachable', "Couldn't load worktrees from Xeno.")
                : reachable === null
                  ? t('jarvis.screen.listLoading', 'Loading…')
                  : t('jarvis.screen.noWorktrees', 'Nothing active right now.')}
            </Text>
          ) : (
            worktrees.map((wt) => (
              <Pressable
                key={wt.id}
                onPress={() => onAsk(askForUpdate(wt))}
                onLongPress={() => setHeld(wt)}
                disabled={!enabled}
                style={({ pressed }) => [styles.row, pressed && pressedStyle]}
                accessibilityRole="button"
                accessibilityLabel={t('jarvis.screen.hearUpdate', 'Hear the latest on {{name}}', {
                  name: wt.name
                })}
                accessibilityHint={t(
                  'jarvis.screen.rowHint',
                  'Touch and hold to talk about it, send it a message or open it'
                )}
              >
                <View style={[styles.dot, { backgroundColor: stateColor(wt.state) }]} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {wt.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {stateLabel(wt.state, t)}
                    {wt.repo ? ` · ${wt.repo}` : ''}
                    {wt.status ? ` · ${wt.status}` : ''}
                  </Text>
                </View>
                {wt.artifacts[0] ? <JarvisArtifactButton artifact={wt.artifacts[0]} /> : null}
                <ChevronRight size={18} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
      <ActionSheetModal
        visible={held != null}
        title={held?.name}
        message={held?.repo}
        onClose={() => setHeld(null)}
        actions={
          held
            ? [
                {
                  id: 'talk',
                  label: t('jarvis.worktree.talkAbout', 'Talk about this'),
                  icon: MessageCircle,
                  closeBeforePress: true,
                  onPress: () => onAsk(askToTalkAbout(held))
                },
                {
                  id: 'send',
                  label: t('jarvis.worktree.sendMessage', 'Send a message'),
                  icon: Send,
                  closeBeforePress: true,
                  onPress: () => onAsk(askToSendMessage(held))
                },
                {
                  id: 'open',
                  label: t('jarvis.worktree.openInOrca', 'Open in Orca'),
                  icon: SquareArrowOutUpRight,
                  closeBeforePress: true,
                  onPress: () => onOpen(held.id)
                }
              ]
            : []
        }
      />
    </>
  )
}

const styles = themedStyleSheet(() => ({
  cardsScroller: { flexGrow: 0 },
  cards: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.bgRaised,
    maxWidth: 320
  },
  cardText: { flexShrink: 1 },
  tabs: { marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    paddingVertical: spacing.md
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.bgRaised
  },
  rowText: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: typography.bodySize, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: typography.metaSize },
  dot: { width: 8, height: 8, borderRadius: 4 }
}))
