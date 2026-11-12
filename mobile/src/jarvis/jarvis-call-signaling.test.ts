import { describe, expect, it } from 'vitest'
import { clientReadyMessage, parseChannelData } from './jarvis-call-signaling'

describe('the data channel', () => {
  it('reads JSON messages and skips the rest', () => {
    expect(parseChannelData('{"label":"rtvi-ai","type":"bot-started-speaking"}')).toEqual({
      label: 'rtvi-ai',
      type: 'bot-started-speaking'
    })
    expect(parseChannelData('ping: 123')).toBeNull()
    expect(parseChannelData(new ArrayBuffer(2))).toBeNull()
  })

  it("says hello the way Pipecat's RTVI expects", () => {
    expect(JSON.parse(clientReadyMessage())).toMatchObject({
      label: 'rtvi-ai',
      type: 'client-ready'
    })
  })
})
