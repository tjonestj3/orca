import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ AppState: { currentState: 'active' } }))

const { pageShowsSession } = await import('./page-shows-session')

describe('whether the page is showing a session', () => {
  it('is a session screen of its own', () => {
    expect(pageShowsSession('/h/home/session/wt-1', null)).toBe(true)
  })

  it('is the host list once its page opens a session inside itself', () => {
    expect(pageShowsSession('/h/home', '/h/home/session/wt-1')).toBe(true)
    expect(pageShowsSession('/h/home', '/h/home/session/wt-1?executionHost=ssh%3Abox')).toBe(true)
  })

  it('is not the host list showing its list, or before its page says where it is', () => {
    expect(pageShowsSession('/h/home', '/h/home')).toBe(false)
    expect(pageShowsSession('/h/home', null)).toBe(false)
  })
})
