import { describe, expect, it } from 'vitest'
import {
  PLUS_ORB,
  approvalOrbPlace,
  TERMINAL_MIC_ORB,
  micOrbPlace,
  plusOrbPlace,
  readPageAnchorMessage,
  terminalMicOrbPlace
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
  it('just right of the host list’s + button, centred on it', () => {
    expect(plusOrbPlace({ x: 340, y: 790, width: 44, height: 44 })).toEqual({
      left: 340 + 44 + 8,
      top: 790 + (44 - PLUS_ORB) / 2,
      size: PLUS_ORB
    })
  })

  it('just right of a terminal’s mic, centred on it', () => {
    expect(terminalMicOrbPlace({ x: 600, y: 800, width: 40, height: 40 })).toEqual({
      left: 648,
      top: 800 + (40 - TERMINAL_MIC_ORB) / 2,
      size: TERMINAL_MIC_ORB
    })
  })

  it('at the right end of a permission card’s button row, level with its buttons', () => {
    expect(approvalOrbPlace({ x: 30, y: 600, width: 380, height: 44 }, 28)).toEqual({
      left: 382,
      top: 608
    })
  })

  it('just left of the composer’s mic, centred on it', () => {
    expect(micOrbPlace({ x: 358, y: 800, width: 36, height: 36 })).toEqual({
      right: 350,
      middle: 818
    })
  })
})
