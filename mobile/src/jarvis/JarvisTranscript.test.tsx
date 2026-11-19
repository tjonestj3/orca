import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JarvisMessage } from './jarvis-history'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator'
}))
// The list draws every item; each new line's wrapper says which entrance it got.
vi.mock('react-native-reanimated', () => ({
  default: {
    View: 'AnimatedView',
    FlatList: (props: {
      data: { key: string }[]
      renderItem: (info: { item: unknown; index: number }) => unknown
    }) => props.data.map((item, index) => props.renderItem({ item, index }))
  },
  FadeInDown: { duration: () => 'rise-from-below' },
  FadeInUp: { duration: () => 'drop-from-above' }
}))
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn() }))
vi.mock('lucide-react-native', () => ({ ArrowDown: 'ArrowDown' }))
vi.mock('../theme/themed-styles', () => ({ themedStyleSheet: () => ({}) }))
vi.mock('../theme/use-mobile-color-scheme', () => ({ useMobileColorScheme: () => 'dark' }))
vi.mock('../theme/mobile-theme', () => ({ colors: {}, pressedStyle: {}, spacing: {} }))
vi.mock('../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (_key: string, fallback: string) => fallback
}))
vi.mock('./JarvisTranscriptRow', () => ({ JarvisTranscriptRow: 'Row' }))

const { JarvisTranscript } = await import('./JarvisTranscript')

const message = (
  id: number,
  text: string,
  kind: JarvisMessage['kind'] = 'reply'
): JarvisMessage => ({
  id,
  kind,
  text,
  at: 1,
  via: 'typed',
  done: true,
  rev: id
})

let tree: ReactTestRenderer | undefined

function show(messages: JarvisMessage[]) {
  const element = (
    <JarvisTranscript messages={messages} hearing="" enabled onReplay={() => undefined} />
  )
  act(() => {
    if (tree) {
      tree.update(element)
    } else {
      tree = create(element)
    }
  })
  return tree!
}

const entrances = (root: ReactTestRenderer) =>
  Object.fromEntries(
    root.root
      .findAllByType('AnimatedView' as never)
      .map((node) => [node.findByType('Row' as never).props.entry.key, node.props.entering])
  )

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
})

describe('lines arriving in the Xeno chat', () => {
  it('opens on the conversation as it was, with nothing sliding in', () => {
    show([])
    expect(entrances(show([message(1, 'Hi.'), message(2, 'Hello.')]))).toEqual({
      '1': undefined,
      '2': undefined
    })
  })

  it('brings a new line up from below, as the Claude app does', () => {
    show([message(1, 'Hi.')])
    const root = show([message(1, 'Hi.'), message(2, 'status?', 'you')])
    expect(entrances(root)).toEqual({ '1': undefined, '2': 'rise-from-below' })
  })
})
