import { describe, expect, it, vi } from 'vitest'
import { newJarvisConversation, sendJarvisChat, stopJarvisChat } from './jarvis-chat'

const URL = 'http://h:7860/api/jarvis/chat'

function replying(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

describe('sendJarvisChat', () => {
  it('posts what was typed and what the app is viewing, and returns the kept message', async () => {
    const fetcher = replying(200, {
      message: { id: 9, kind: 'you', text: 'status?', via: 'typed', done: true, rev: 3 }
    })
    const result = await sendJarvisChat(URL, 'status?', 'wt-1', fetcher)
    expect(result).toEqual({
      ok: true,
      message: { id: 9, kind: 'you', text: 'status?', at: 0, via: 'typed', done: true, rev: 3 }
    })
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(URL)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'status?', viewing: 'wt-1' })
  })

  it('tells a refusal from an unreachable desktop', async () => {
    expect(await sendJarvisChat(URL, 'hi', null, replying(400, { error: 'no' }))).toEqual({
      ok: false,
      error: 'refused'
    })
    const down = vi.fn(async () => {
      throw new TypeError('Network request failed')
    })
    expect(await sendJarvisChat(URL, 'hi', null, down)).toEqual({ ok: false, error: 'unreachable' })
  })
})

describe('stop and new conversation', () => {
  it('report whether the desktop did it', async () => {
    expect(await stopJarvisChat(`${URL}/stop`, replying(200, { stopped: true }))).toBe(true)
    expect(await stopJarvisChat(`${URL}/stop`, replying(200, { stopped: false }))).toBe(false)
    expect(await newJarvisConversation(`${URL}/new`, replying(200, { message: {} }))).toBe(true)
    expect(await newJarvisConversation(`${URL}/new`, replying(500, {}))).toBe(false)
  })
})
