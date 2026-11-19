import { describe, expect, it } from 'vitest'
import { HEADER_ORB, HEADER_ORB_GAP, headerOrbPlace, readPageHeaderMessage } from './page-header'

describe('the page header message', () => {
  it('says where the header’s button is, or that there isn’t one', () => {
    expect(readPageHeaderMessage('{"type":"xeno-page-header","at":"300,8,44,44"}')).toEqual({
      x: 300,
      y: 8,
      width: 44,
      height: 44
    })
    expect(readPageHeaderMessage('{"type":"xeno-page-header","at":""}')).toBeNull()
  })

  it('leaves anything else for Orca’s bridge', () => {
    expect(readPageHeaderMessage('{"type":"rpc","id":2}')).toBeUndefined()
    expect(readPageHeaderMessage('{"type":"xeno-page-header","at":"a,b"}')).toBeUndefined()
    expect(readPageHeaderMessage('xeno-page-header')).toBeUndefined()
  })
})

it('puts the orb just right of the button, centred on it', () => {
  expect(headerOrbPlace({ x: 300, y: 8, width: 44, height: 44 })).toEqual({
    left: 300 + 44 + HEADER_ORB_GAP,
    top: 8 + (44 - HEADER_ORB) / 2,
    size: HEADER_ORB
  })
})
