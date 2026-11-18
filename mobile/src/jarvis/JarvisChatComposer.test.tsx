import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

const keyboard = vi.hoisted(() => ({ dismiss: vi.fn() }))

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  Keyboard: keyboard
}))
vi.mock('lucide-react-native', () => ({
  ArrowUp: 'ArrowUp',
  AudioLines: 'AudioLines',
  KeyboardOff: 'KeyboardOff',
  PhoneOff: 'PhoneOff',
  Square: 'Square'
}))
vi.mock('../theme/themed-styles', () => ({ themedStyleSheet: () => ({}) }))
vi.mock('../theme/use-mobile-color-scheme', () => ({ useMobileColorScheme: () => 'dark' }))
vi.mock('../theme/mobile-theme', () => ({
  colors: {},
  pressedStyle: {},
  spacing: {},
  typography: {}
}))
vi.mock('../components/composer-input/composer-input-styles', () => ({
  COMPOSER_CONTROL_HIT_SLOP: 0,
  composerInputStyles: {}
}))
vi.mock('../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (_key: string, fallback: string) => fallback
}))

const { JarvisChatComposer } = await import('./JarvisChatComposer')

let tree: ReactTestRenderer | undefined

function render(onSend: (text: string) => Promise<boolean>) {
  act(() => {
    tree = create(
      <JarvisChatComposer
        enabled
        working={false}
        onSend={onSend}
        onStop={() => undefined}
        calling={false}
        onCall={() => undefined}
        onHangUp={() => undefined}
      />
    )
  })
  return tree!
}

const byLabel = (root: ReactTestRenderer, label: string) =>
  root.root.findAll((node) => node.props.accessibilityLabel === label && node.type === 'Pressable')

async function typeAndSend(root: ReactTestRenderer) {
  const input = root.root.findByType('TextInput' as never)
  act(() => input.props.onChangeText('status?'))
  const [send] = byLabel(root, 'Send')
  await act(async () => send.props.onPress())
}

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
  keyboard.dismiss.mockClear()
})

describe('the Xeno composer and the keyboard', () => {
  it('puts the keyboard away once Xeno has the message', async () => {
    await typeAndSend(render(async () => true))
    expect(keyboard.dismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps it up when the message did not get through, so it can be sent again', async () => {
    await typeAndSend(render(async () => false))
    expect(keyboard.dismiss).not.toHaveBeenCalled()
  })

  it('has a button to put it away while typing', () => {
    const root = render(async () => true)
    expect(byLabel(root, 'Hide keyboard')).toHaveLength(0)
    act(() => root.root.findByType('TextInput' as never).props.onFocus())
    const [hide] = byLabel(root, 'Hide keyboard')
    act(() => hide.props.onPress())
    expect(keyboard.dismiss).toHaveBeenCalledTimes(1)
    act(() => root.root.findByType('TextInput' as never).props.onBlur())
    expect(byLabel(root, 'Hide keyboard')).toHaveLength(0)
  })
})
