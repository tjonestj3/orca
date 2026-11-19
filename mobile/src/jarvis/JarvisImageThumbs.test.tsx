import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Image: 'Image',
  Modal: 'Modal'
}))
vi.mock('lucide-react-native', () => ({ ImageOff: 'ImageOff' }))
vi.mock('../theme/themed-styles', () => ({ themedStyleSheet: () => ({}) }))
vi.mock('../theme/mobile-theme', () => ({ colors: {}, pressedStyle: {}, radii: {}, spacing: {} }))
vi.mock('./jarvis-key', () => ({ xenoKeys: { headers: () => ({ 'X-Xeno-Key': 'k' }) } }))

const { JarvisImageThumbs } = await import('./JarvisImageThumbs')

const t = (_key: string, fallback: string) => fallback
const A = 'ab'.repeat(16)
let tree: ReactTestRenderer | undefined

function render(ids: string[], url: ((id: string) => string | null) | undefined) {
  act(() => {
    tree = create(<JarvisImageThumbs ids={ids} imageUrl={url} t={t} />)
  })
  return tree!
}

afterEach(() => {
  act(() => tree?.unmount())
  tree = undefined
})

describe('images in your message', () => {
  it('loads each one from Xeno with the phone key', () => {
    const root = render([A], (id) => `http://h:7860/api/jarvis/images/${id}`)
    const [image] = root.root.findAllByType('Image' as never)
    expect(image.props.source).toEqual({
      uri: `http://h:7860/api/jarvis/images/${A}`,
      headers: { 'X-Xeno-Key': 'k' }
    })
  })

  it('opens full screen on a tap, and closes on another', () => {
    const root = render([A], (id) => `http://h/${id}`)
    const modal = () => root.root.findByType('Modal' as never)
    expect(modal().props.visible).toBe(false)
    const [open] = root.root.findAll(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === 'Open image'
    )
    act(() => open.props.onPress())
    expect(modal().props.visible).toBe(true)
    const [close] = root.root.findAll(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === 'Close image'
    )
    act(() => close.props.onPress())
    expect(modal().props.visible).toBe(false)
  })

  it('shows a placeholder where there is no address for the image', () => {
    const root = render([A], undefined)
    expect(root.root.findAllByType('Image' as never)).toHaveLength(0)
    expect(root.root.findAllByType('ImageOff' as never)).toHaveLength(1)
  })
})
