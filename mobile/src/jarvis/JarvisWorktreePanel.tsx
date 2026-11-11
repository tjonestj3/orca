import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronRight, MessageCircle, Play, Send, SquareArrowOutUpRight } from 'lucide-react-native'
import { ActionSheetModal } from '../components/ActionSheetModal'
import { MobileSegmentedControl } from '../components/MobileSegmentedControl'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { askForUpdate, askToSendMessage, askToTalkAbout } from './jarvis-asks'
import type { JarvisWorktreeCard } from './jarvis-call-state'
import type { JarvisMessage } from './jarvis-history'
import type { JarvisWorktree } from './jarvis-worktrees'

type Translate = ReturnType<typeof useMobileTranslation>

type Props = {
  readonly cards: readonly JarvisWorktreeCard[]
  readonly worktrees: readonly JarvisWorktree[]
  // null until the first answer, false when the desktop's Jarvis can't be reached.
  readonly reachable: boolean | null
  readonly enabled: boolean
  readonly onAsk: (text: string) => void
  readonly onOpen: (worktreeId: string) => void
  // What Jarvis said lately, oldest first; tapping one plays it again.
  readonly messages: readonly JarvisMessage[]
  readonly onReplay: (id: number) => void
}

type Tab = 'worktrees' | 'messages'

function timeOf(at: number): string {
  if (!at) {
    return ''
  }
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

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
// The Messages tab lists what Jarvis said lately, newest first: tap one to hear it again.
export function JarvisWorktreePanel({
  cards,
  worktrees,
  reachable,
  enabled,
  onAsk,
  onOpen,
  messages,
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
              <SquareArrowOutUpRight size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <MobileSegmentedControl<Tab>
        style={styles.tabs}
        segments={[
          { value: 'worktrees', label: t('jarvis.screen.worktrees', 'Worktrees') },
          { value: 'messages', label: t('jarvis.screen.messages', 'Messages') }
        ]}
        selected={tab}
        onSelect={setTab}
        testIDPrefix="jarvis-panel"
        fill
        tabs
      />
      {tab === 'messages' ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>
              {t('jarvis.screen.noMessages', 'What Jarvis says shows up here to play again.')}
            </Text>
          ) : (
            messages.toReversed().map((message) => (
              <Pressable
                key={message.id}
                onPress={() => onReplay(message.id)}
                disabled={!enabled}
                style={({ pressed }) => [styles.row, pressed && pressedStyle]}
                accessibilityRole="button"
                accessibilityLabel={t('jarvis.screen.playAgain', 'Play again: {{text}}', {
                  text: message.text
                })}
              >
                <View style={styles.rowText}>
                  <Text style={styles.meta} numberOfLines={1}>
                    {message.kind === 'update'
                      ? t('jarvis.screen.agentUpdate', 'Agent update')
                      : t('jarvis.screen.jarvisReply', 'Jarvis')}
                    {message.at ? ` · ${timeOf(message.at)}` : ''}
                  </Text>
                  <Text style={styles.messageText} numberOfLines={4}>
                    {message.text}
                  </Text>
                </View>
                <Play size={18} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {worktrees.length === 0 ? (
            <Text style={styles.empty}>
              {reachable === false
                ? t('jarvis.screen.listUnreachable', "Couldn't load worktrees from Jarvis.")
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
    maxWidth: 260
  },
  cardText: { flexShrink: 1 },
  tabs: { marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  messageText: { color: colors.textPrimary, fontSize: typography.bodySize, lineHeight: 20 },
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
