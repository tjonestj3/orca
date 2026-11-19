import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ArrowDown } from 'lucide-react-native'
import { useEdgeScrollBar } from '../layout/edge-scroll-view'
import * as Clipboard from 'expo-clipboard'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, spacing } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisMessage } from './jarvis-history'
import {
  animatesIn,
  showJumpToLatest,
  transcriptEntries,
  transcriptListItems,
  type TranscriptEntry,
  type TranscriptListItem
} from './jarvis-transcript'
import { JarvisTranscriptRow } from './JarvisTranscriptRow'

const COPIED_MS = 1500
// Within this of the newest line, new lines and a growing reply keep it in view; further up, the reader stays put.
const FOLLOW_WITHIN = 80
// A new line rises into place from just below (FadeInDown starts 25 pt low). The inverted list flips the
// scroll view and each cell, which cancel out, so this reads the same as in an upright list.
const ARRIVE = FadeInDown.duration(220)

type Props = {
  readonly messages: readonly JarvisMessage[]
  // What Jarvis is hearing right now, shown as your next line until the server keeps it.
  readonly hearing: string
  readonly enabled: boolean
  // Xeno is answering a turn right now; shown under the last line until its reply starts to appear.
  readonly working?: boolean
  readonly onReplay: (id: number) => void
  // Changes when the person sends something: the conversation goes to its newest line, however far up they were.
  readonly followKey?: number
  // Where Xeno serves the images you sent it.
  readonly imageUrl?: (id: string) => string | null
}

function Gap() {
  return <View style={styles.gap} />
}

// The conversation with Xeno as a chat, drawn like the Claude app's: newest at the bottom, new text pushing the
// rest up while you're at the bottom, and staying put while you read further up, with a button back down.
// Yours on the right, Xeno's across the page. Tap one of Xeno's to hear it again; touch and hold any to copy it.
export function JarvisTranscript({
  messages,
  hearing,
  enabled,
  working = false,
  onReplay,
  followKey,
  imageUrl
}: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const list = useRef<FlatList<TranscriptListItem>>(null)
  const edgeBar = useEdgeScrollBar()
  // Keys already drawn: null until the first lines load, so what's there on opening never slides in.
  const seen = useRef<Set<string> | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [height, setHeight] = useState(0)
  const [away, setAway] = useState(false)
  const items = transcriptListItems(transcriptEntries(messages, hearing), working)

  useEffect(() => {
    if (items.length === 0) {
      return
    }
    const known = seen.current ?? new Set<string>()
    for (const item of items) {
      known.add(item.key)
    }
    seen.current = known
  })

  useEffect(() => {
    if (followKey) {
      list.current?.scrollToOffset({ offset: 0, animated: true })
    }
  }, [followKey])

  const copy = (entry: TranscriptEntry): void => {
    void Clipboard.setStringAsync(entry.text).then(() => {
      setCopied(entry.key)
      setTimeout(() => setCopied((key) => (key === entry.key ? null : key)), COPIED_MS)
    })
  }

  const renderItem = ({ item }: ListRenderItemInfo<TranscriptListItem>) => (
    // Always the same wrapper, so a line never remounts once it has arrived; `entering` only plays on mount.
    <Animated.View entering={animatesIn(item, seen.current) ? ARRIVE : undefined}>
      {item.kind === 'working' ? (
        <View style={styles.working} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={styles.workingText}>{t('jarvis.chat.working', 'Xeno is working…')}</Text>
        </View>
      ) : (
        <JarvisTranscriptRow
          entry={item.entry}
          enabled={enabled}
          copied={copied === item.key}
          t={t}
          onReplay={onReplay}
          onCopy={copy}
          imageUrl={imageUrl}
        />
      )}
    </Animated.View>
  )

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    setAway(showJumpToLatest(event.nativeEvent.contentOffset.y, height))
  }

  return (
    <View
      style={styles.list}
      onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}
    >
      <Animated.FlatList
        {...edgeBar}
        ref={list}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        // Drawn from the bottom up: offset 0 is the newest line, so a growing reply pushes the rest up by itself.
        inverted
        // A reader further up stays where they are as lines arrive; near the bottom, iOS glides to the new one.
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: FOLLOW_WITHIN
        }}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={64}
      />
      {items.length === 0 ? (
        <Text style={styles.empty} pointerEvents="none">
          {t('jarvis.transcript.empty', 'Your conversation with Xeno shows up here.')}
        </Text>
      ) : null}
      {away ? (
        <Pressable
          onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
          style={({ pressed }) => [styles.jump, pressed && pressedStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('jarvis.transcript.latest', 'Go to the latest message')}
        >
          <ArrowDown size={18} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  list: { flex: 1 },
  // Inverted: paddingTop is the space under the newest line, paddingBottom the space above the oldest.
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md
  },
  gap: { height: spacing.lg },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  working: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  workingText: { color: colors.textMuted, fontSize: 15 },
  jump: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  }
}))
