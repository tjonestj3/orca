import { useEffect, useState } from 'react'
import { loadHosts } from '../host-catalog/host-store'
import type { HostProfile } from '../host-catalog/host-profile'
import { jarvisPairUrl, jarvisPingUrl } from './jarvis-endpoint'
import { pairIfNeeded, xenoFetch } from './jarvis-key'

const POLL_MS = 15_000
const TIMEOUT_MS = 4_000

// Whether Xeno answers on this desktop; when it let the ping in without the key (over Tailscale), it also
// fetches the key, so home Wi-Fi works from then on.
async function answers(endpoint: string): Promise<boolean> {
  const url = jarvisPingUrl(endpoint)
  if (!url) {
    return false
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    const response = await xenoFetch(url, { signal: abort.signal })
    if (response.ok) {
      await pairIfNeeded(await response.json().catch(() => null), jarvisPairUrl(endpoint))
    }
    return response.ok
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
      const results = await Promise.all(hosts.map((h) => answers(h.endpoint)))
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
