import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

const keyboard = vi.hoisted(() => ({ dismiss: vi.fn() }))
const picker = vi.hoisted(() => ({ pickXenoImages: vi.fn() }))
// The attach menu: picks its first choice (Photo Library) at once.
const sheet = vi.hoisted(() => ({
  showActionSheetWithOptions: vi.fn((_options: unknown, choose: (index: number) => void) =>
    choose(0)
  )
}))

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  Image: 'Image',
  ScrollView: 'ScrollView',
  Keyboard: keyboard,
  Platform: { OS: 'ios' },
  ActionSheetIOS: sheet,
  Alert: { alert: vi.fn() }
}))
vi.mock('./jarvis-images', () => ({ MAX_XENO_IMAGES: 4, pickXenoImages: picker.pickXenoImages }))
vi.mock('lucide-react-native', () => ({
  ArrowUp: 'ArrowUp',
  AudioLines: 'AudioLines',
  KeyboardOff: 'KeyboardOff',
  PhoneOff: 'PhoneOff',
  Plus: 'Plus',
  Square: 'Square',
  X: 'X'
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
type JarvisChatImage = { readonly base64: string; readonly uri?: string }
type JarvisChatOutcome = 'sent' | 'unreachable' | 'refused'

let tree: ReactTestRenderer | undefined

function render(
  onSend: (text: string, images: readonly JarvisChatImage[]) => Promise<JarvisChatOutcome>
) {
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
  picker.pickXenoImages.mockReset()
})

describe('the Xeno composer and the keyboard', () => {
  it('puts the keyboard away once Xeno has the message', async () => {
    await typeAndSend(render(async (): Promise<JarvisChatOutcome> => 'sent'))
    expect(keyboard.dismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps it up when the message did not get through, so it can be sent again', async () => {
    await typeAndSend(render(async (): Promise<JarvisChatOutcome> => 'unreachable'))
    expect(keyboard.dismiss).not.toHaveBeenCalled()
  })

  it('has a button to put it away while typing', () => {
    const root = render(async (): Promise<JarvisChatOutcome> => 'sent')
    expect(byLabel(root, 'Hide keyboard')).toHaveLength(0)
    act(() => root.root.findByType('TextInput' as never).props.onFocus())
    const [hide] = byLabel(root, 'Hide keyboard')
    act(() => hide.props.onPress())
    expect(keyboard.dismiss).toHaveBeenCalledTimes(1)
    act(() => root.root.findByType('TextInput' as never).props.onBlur())
    expect(byLabel(root, 'Hide keyboard')).toHaveLength(0)
  })
})

describe('attaching images', () => {
  const shot = { base64: 'AAAA', uri: 'file:///shot.jpg' }

  async function attach(root: ReactTestRenderer) {
    const [plus] = byLabel(root, 'Attach images')
    await act(async () => plus.props.onPress())
  }

  it('shows each picked image, which can be taken off again', async () => {
    picker.pickXenoImages.mockResolvedValue([shot])
    const root = render(async (): Promise<JarvisChatOutcome> => 'sent')
    await attach(root)
    expect(picker.pickXenoImages).toHaveBeenCalledWith('library', 4)
    expect(root.root.findAllByType('Image' as never)).toHaveLength(1)
    const [remove] = byLabel(root, 'Remove image')
    act(() => remove.props.onPress())
    expect(root.root.findAllByType('Image' as never)).toHaveLength(0)
  })

  it('sends the images with nothing typed, and clears them once Xeno has them', async () => {
    picker.pickXenoImages.mockResolvedValue([shot])
    const onSend = vi.fn(async (): Promise<JarvisChatOutcome> => 'sent')
    const root = render(onSend)
    await attach(root)
    const [send] = byLabel(root, 'Send')
    await act(async () => send.props.onPress())
    expect(onSend).toHaveBeenCalledWith('', [shot])
    expect(root.root.findAllByType('Image' as never)).toHaveLength(0)
  })

  it('keeps them when the message did not get through', async () => {
    picker.pickXenoImages.mockResolvedValue([shot])
    const root = render(async (): Promise<JarvisChatOutcome> => 'unreachable')
    await attach(root)
    const [send] = byLabel(root, 'Send')
    await act(async () => send.props.onPress())
    expect(root.root.findAllByType('Image' as never)).toHaveLength(1)
  })

  it('says so when an image could not be attached', async () => {
    picker.pickXenoImages.mockRejectedValue(new Error('too big'))
    const root = render(async (): Promise<JarvisChatOutcome> => 'sent')
    await attach(root)
    const texts = root.root.findAllByType('Text' as never).map((node) => node.props.children)
    expect(texts).toContain("Couldn't attach that image.")
  })
})

describe('when Xeno can be reached but refuses the message', () => {
  const texts = (root: ReactTestRenderer) =>
    root.root.findAllByType('Text' as never).map((node) => node.props.children)

  it('says the image could not be sent, not that Xeno is unreachable', async () => {
    picker.pickXenoImages.mockResolvedValue([{ base64: 'AAAA', uri: 'file:///bad.jpg' }])
    const root = render(async (): Promise<JarvisChatOutcome> => 'refused')
    const [plus] = byLabel(root, 'Attach images')
    await act(async () => plus.props.onPress())
    const [send] = byLabel(root, 'Send')
    await act(async () => send.props.onPress())
    expect(texts(root)).toContain("Xeno couldn't take that image. Remove it and try again.")
    expect(texts(root)).not.toContain("Couldn't reach Xeno. Your message is still here.")
  })

  it('says the message was refused when there was no image', async () => {
    const root = render(async (): Promise<JarvisChatOutcome> => 'refused')
    await typeAndSend(root)
    expect(texts(root)).toContain("Xeno couldn't take that message. It's still here.")
  })

  it('still says Xeno is unreachable when it is', async () => {
    const root = render(async (): Promise<JarvisChatOutcome> => 'unreachable')
    await typeAndSend(root)
    expect(texts(root)).toContain("Couldn't reach Xeno. Your message is still here.")
  })
})
