import { describe, expect, it, vi } from 'vitest'

// The library picker reads each chosen photo as it hands it over; `read` counts how many it read.
const library = vi.hoisted(() => ({ chosen: 0, read: 0 }))

vi.mock('expo-image-picker', () => ({}))
vi.mock('../files/attachments/mobile-image-source-picker', () => ({
  defaultMobileImageFileFactory: vi.fn(),
  readUriAsBase64: vi.fn(),
  pickMobileImages: async function* () {
    for (let i = 0; i < library.chosen; i++) {
      library.read++
      yield { base64: `img${i}`, uri: `file:///${i}.jpg` }
    }
  }
}))

const { pickXenoImages } = await import('./jarvis-images')

describe('pickXenoImages from the library', () => {
  it('keeps as many as there is room for, and reads no more than that', async () => {
    library.chosen = 20
    library.read = 0
    const picked = await pickXenoImages('library', 4)
    expect(picked.map((image) => image.uri)).toEqual([
      'file:///0.jpg',
      'file:///1.jpg',
      'file:///2.jpg',
      'file:///3.jpg'
    ])
    expect(library.read).toBe(4)
  })

  it('keeps every photo when fewer were chosen than there is room for', async () => {
    library.chosen = 2
    library.read = 0
    expect(await pickXenoImages('library', 4)).toHaveLength(2)
  })
})
