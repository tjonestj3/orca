import { describe, expect, it } from 'vitest'
import { chooseXenoHost, hostIdFromPath } from './jarvis-host-choice'

const none = new Set<string>()
const both = new Set(['laptop', 'pc'])

describe('hostIdFromPath', () => {
  it('reads the desktop out of a route inside it, and nothing elsewhere', () => {
    expect(hostIdFromPath('/h/pc/session/repo%3A%3A%2Fw%2Fa')).toBe('pc')
    expect(hostIdFromPath('/h/laptop')).toBe('laptop')
    expect(hostIdFromPath('/h/some%20host/jarvis')).toBe('some host')
    expect(hostIdFromPath('/')).toBeNull()
    expect(hostIdFromPath('/tasks')).toBeNull()
  })
})

describe('chooseXenoHost', () => {
  const base = { routeHostId: null, lastHostId: null, callHostId: null, reachable: none }

  it('keeps a live call on its desktop wherever you go', () => {
    expect(
      chooseXenoHost({ ...base, callHostId: 'laptop', routeHostId: 'pc', reachable: both })
    ).toEqual({ hostId: 'laptop', needsPick: false })
  })

  it("is the desktop you're inside", () => {
    expect(
      chooseXenoHost({ ...base, routeHostId: 'pc', lastHostId: 'laptop', reachable: both })
    ).toEqual({ hostId: 'pc', needsPick: false })
  })

  it('is the last desktop you were in when you are in none', () => {
    expect(chooseXenoHost({ ...base, lastHostId: 'laptop', reachable: both })).toEqual({
      hostId: 'laptop',
      needsPick: false
    })
  })

  it('takes the only desktop running Xeno when none was picked yet', () => {
    expect(chooseXenoHost({ ...base, reachable: new Set(['pc']) })).toEqual({
      hostId: 'pc',
      needsPick: false
    })
  })

  it('asks which, once, when several desktops run Xeno and none was picked', () => {
    expect(chooseXenoHost({ ...base, reachable: both })).toEqual({ hostId: null, needsPick: true })
  })

  it('has nothing to talk to with no desktop running Xeno', () => {
    expect(chooseXenoHost(base)).toEqual({ hostId: null, needsPick: false })
  })
})
