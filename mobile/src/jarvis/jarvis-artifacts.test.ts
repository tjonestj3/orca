import { describe, expect, it } from 'vitest'
import { claudeArtifactUrl, readArtifacts } from './jarvis-artifacts'

const MOCKUP = 'https://claude.ai/artifact/VjFHgpyKnqH5fcXKHKHbNj'

describe('claudeArtifactUrl', () => {
  it('takes the claude.ai artifact links the Claude app opens', () => {
    for (const url of [
      MOCKUP,
      'https://claude.ai/artifacts/abc',
      'https://claude.ai/public/artifacts/abc',
      'https://claude.ai/code/artifact/0b5c6a1e-9f7d-4c1e-8a2b-3c4d5e6f7a8b'
    ]) {
      expect(claudeArtifactUrl(url)).toBe(url)
    }
  })

  it('never opens anything else an agent wrote', () => {
    for (const url of [
      'https://evil.example/artifact/abc',
      'http://claude.ai/artifact/abc',
      'https://claude.ai.evil.example/artifact/abc',
      'https://claude.ai/artifacts/invite/abc',
      'https://claude.ai/chat/abc',
      'javascript:alert(1)',
      42,
      null
    ]) {
      expect(claudeArtifactUrl(url)).toBeNull()
    }
  })
})

describe('readArtifacts', () => {
  it('keeps the valid links with their titles, at most three', () => {
    const raw = [
      { url: MOCKUP, title: 'Control layouts' },
      { url: 'https://evil.example/artifact/x', title: 'Nope' },
      { url: 'https://claude.ai/artifact/b', title: null },
      { url: 'https://claude.ai/artifact/c' },
      { url: 'https://claude.ai/artifact/d', title: 'Fourth' }
    ]
    expect(readArtifacts(raw)).toEqual([
      { url: MOCKUP, title: 'Control layouts' },
      { url: 'https://claude.ai/artifact/b', title: null },
      { url: 'https://claude.ai/artifact/c', title: null }
    ])
    expect(readArtifacts(undefined)).toEqual([])
  })
})
