import { describe, expect, it } from 'vitest'
import { jarvisOfferUrl } from './jarvis-endpoint'

describe('jarvisOfferUrl', () => {
  it("uses the paired host's own address on Jarvis's port", () => {
    expect(jarvisOfferUrl('ws://100.126.129.22:6768')).toBe('http://100.126.129.22:7860/api/offer')
    expect(jarvisOfferUrl('wss://desk.tail1c35d9.ts.net')).toBe(
      'http://desk.tail1c35d9.ts.net:7860/api/offer'
    )
    expect(jarvisOfferUrl('ws://[fd7a:115c:a1e0::5]:6768')).toBe(
      'http://[fd7a:115c:a1e0::5]:7860/api/offer'
    )
  })

  it('has no address for an endpoint it cannot parse', () => {
    expect(jarvisOfferUrl('not an endpoint')).toBeNull()
  })
})
