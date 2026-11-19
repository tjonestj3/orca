import { describe, expect, it, vi } from 'vitest'
import { createPageModalStore, readPageModalMessage } from './page-modal'
import { hostInitials } from './jarvis-bubble-policy'

describe('the page sheet message', () => {
  it('is read, and anything else is left for Orca’s bridge', () => {
    expect(readPageModalMessage('{"type":"xeno-page-modal","open":true}')).toBe(true)
    expect(readPageModalMessage('{"type":"xeno-page-modal","open":false}')).toBe(false)
    expect(readPageModalMessage('{"type":"rpc","id":1}')).toBeNull()
    expect(readPageModalMessage('{"type":"rpc","note":"xeno-page-modal"}')).toBeNull()
    expect(readPageModalMessage('{"type":"xeno-page-modal","open":"yes"}')).toBeNull()
    expect(readPageModalMessage('xeno-page-modal{')).toBeNull()
  })
})

describe('which pages have a sheet open', () => {
  it('is open while any page has one, and a page that goes takes its sheet with it', () => {
    const store = createPageModalStore()
    const changed = vi.fn()
    store.subscribe(changed)
    store.set('session-a', true)
    store.set('session-b', true)
    store.set('session-a', false)
    expect(store.read()).toBe(true)
    store.forget('session-b')
    expect(store.read()).toBe(false)
    store.set('session-b', false)
    expect(changed).toHaveBeenCalledTimes(4) // no change, no news
  })
})

describe('a desktop’s initials', () => {
  it('takes the first letter of up to three words', () => {
    expect(hostInitials('Xeno Laptop')).toBe('XL')
    expect(hostInitials('pop-os')).toBe('PO')
    expect(hostInitials('thomas.desktop.home.lan')).toBe('TDH')
    expect(hostInitials('xenocide')).toBe('X')
    expect(hostInitials('  my (work) mac ')).toBe('MWM')
  })
})
