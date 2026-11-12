import { useEffect, useState } from 'react'
import { loadHosts } from '../host-catalog/host-store'
import type { HostProfile } from '../host-catalog/host-profile'
import { jarvisPingUrl } from './jarvis-endpoint'

const POLL_MS = 15_000
const TIMEOUT_MS = 4_000

async function answers(url: string | null): Promise<boolean> {
  if (!url) {
    return false
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    return (await fetch(url, { signal: abort.signal })).ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// The paired desktops, and which of them have Xeno running: each one's ping, which never asks Orca, every 15 s
// while the app is open. `checked` stays false until the first round is in.
export function useXenoHosts(): {
  hosts: readonly HostProfile[]
  reachable: ReadonlySet<string>
  checked: boolean
} {
  const [state, setState] = useState<{
    hosts: readonly HostProfile[]
    reachable: ReadonlySet<string>
    checked: boolean
  }>({ hosts: [], reachable: new Set(), checked: false })
  useEffect(() => {
    let stopped = false
    const check = async (): Promise<void> => {
      const hosts = await loadHosts().catch(() => [])
      const results = await Promise.all(hosts.map((h) => answers(jarvisPingUrl(h.endpoint))))
      if (!stopped) {
        setState({
          hosts,
          reachable: new Set(hosts.filter((_, i) => results[i]).map((h) => h.id)),
          checked: true
        })
      }
    }
    void check()
    const interval = setInterval(() => void check(), POLL_MS)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [])
  return state
}
