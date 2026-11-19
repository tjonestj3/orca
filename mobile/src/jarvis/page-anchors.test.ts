import { describe, expect, it } from 'vitest'
import {
  HEADER_ORB,
  HEADER_ORB_GAP,
  headerOrbPlace,
  micOrbPlace,
  readPageAnchorMessage
} from './page-anchors'

describe('an anchor message', () => {
  it('says where the button is, or that it’s gone', () => {
    expect(
      readPageAnchorMessage('{"type":"xeno-page-anchor","name":"mic","at":"380,800,36,36"}')
    ).toEqual({
      name: 'mic',
      at: { x: 380, y: 800, width: 36, height: 36 }
    })
    expect(readPageAnchorMessage('{"type":"xeno-page-anchor","name":"header","at":""}')).toEqual({
      name: 'header',
      at: null
    })
  })

  it('leaves anything else for Orca’s bridge', () => {
    expect(readPageAnchorMessage('{"type":"rpc","id":2}')).toBeNull()
    expect(readPageAnchorMessage('{"type":"xeno-page-anchor","name":"tabs","at":""}')).toBeNull()
    expect(readPageAnchorMessage('{"type":"xeno-page-anchor","name":"mic","at":"1,2"}')).toBeNull()
    expect(readPageAnchorMessage('xeno-page-anchor')).toBeNull()
  })
})

describe('where the orb goes', () => {
  it('just right of the host list’s menu, centred on it', () => {
    expect(headerOrbPlace({ x: 300, y: 8, width: 44, height: 44 })).toEqual({
      left: 300 + 44 + HEADER_ORB_GAP,
      top: 8 + (44 - HEADER_ORB) / 2,
      size: HEADER_ORB
    })
  })

  it('just left of the composer’s mic, centred on it', () => {
    expect(micOrbPlace({ x: 358, y: 800, width: 36, height: 36 })).toEqual({
      right: 350,
      middle: 818
    })
  })
})
