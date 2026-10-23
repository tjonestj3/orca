import { readShellSession, type BridgeShellSession } from './bridge-client-session'
import { bridgeRouteMoved } from './bridge-route-update'
import {
  sameSafeAreaInsets,
  ZERO_SAFE_AREA_INSETS,
  type BridgeSafeAreaInsets
} from './bridge-safe-area-insets'
import { sameFoldDivision, type BridgeFoldDivision } from './bridge-fold-division'
import { sameTerminalKeyRail, type BridgeTerminalKeyRail } from './bridge-terminal-key'
import type {
  BridgeConnectionSnapshot,
  BridgeHostMessage,
  BridgeInitRoute
} from './bridge-envelope'

type InitMessage = Extract<BridgeHostMessage, { type: 'init' }>

// Same-session init preserves exchanges; replacement drops prior work before publishing the new session to listeners.
export type BridgeClientShellSession = {
  current: () => BridgeShellSession | null
  accept: (message: InitMessage) => void
  onReady: (listener: () => void) => () => void
  // Publish changed params only, never initial/repeated init. Clear consumed one-shot params so repeat taps to the same pane still appear as real changes.
  onRouteUpdate: (listener: (route: BridgeInitRoute | null) => void) => () => void
  onSafeAreaInsetsUpdate: (listener: (insets: BridgeSafeAreaInsets) => void) => () => void
  onKeyboardInsetUpdate: (listener: (height: number) => void) => () => void
  /** Fires when an `init` moved the fold the page holds, including a replacement's. */
  onFoldDivisionUpdate: (listener: (division: BridgeFoldDivision | null) => void) => () => void
  /** Fires when an `init` moved the keys the shell's rail shows, including a replacement's. */
  onTerminalKeyRailUpdate: (listener: (keys: BridgeTerminalKeyRail) => void) => () => void
  close: () => void
}

/** The session's listeners, which the page client hands on as its own members. */
export type BridgeShellSessionListeners = Pick<
  BridgeClientShellSession,
  | 'onReady'
  | 'onRouteUpdate'
  | 'onSafeAreaInsetsUpdate'
  | 'onKeyboardInsetUpdate'
  | 'onFoldDivisionUpdate'
  | 'onTerminalKeyRailUpdate'
>

/** Picked rather than spread: the session's `accept` and `close` are the client's alone. */
export function shellSessionListeners(
  session: BridgeClientShellSession
): BridgeShellSessionListeners {
  return {
    onReady: session.onReady,
    onRouteUpdate: session.onRouteUpdate,
    onSafeAreaInsetsUpdate: session.onSafeAreaInsetsUpdate,
    onKeyboardInsetUpdate: session.onKeyboardInsetUpdate,
    onFoldDivisionUpdate: session.onFoldDivisionUpdate,
    onTerminalKeyRailUpdate: session.onTerminalKeyRailUpdate
  }
}

export function createBridgeClientShellSession(args: {
  onReplaced: () => void
  prime: (connection: BridgeConnectionSnapshot) => void
}): BridgeClientShellSession {
  let session: BridgeShellSession | null = null
  const readyListeners = new Set<() => void>()
  const routeUpdateListeners = new Set<(route: BridgeInitRoute | null) => void>()
  const insetsListeners = new Set<(insets: BridgeSafeAreaInsets) => void>()
  const keyboardListeners = new Set<(height: number) => void>()
  const foldListeners = new Set<(division: BridgeFoldDivision | null) => void>()
  const railListeners = new Set<(keys: BridgeTerminalKeyRail) => void>()

  return {
    current: () => session,
    accept: (message) => {
      const held = session
      const update = held !== null && held.sessionId === message.sessionId ? held : null
      if (held !== null && update === null) {
        args.onReplaced()
      }
      // Preserve the original storage snapshot across same-session init while rebuilding the session value with new route/insets.
      const sent = message.safeAreaInsets ?? ZERO_SAFE_AREA_INSETS
      const movedInsets = held !== null && !sameSafeAreaInsets(held.safeAreaInsets, sent)
      // Reuse equal values’ identity so repeated ready cannot rerender keyed readers.
      const safeAreaInsets = held === null || movedInsets ? sent : held.safeAreaInsets
      const keyboardInset = message.keyboardInset ?? 0
      const movedKeyboard = held !== null && held.keyboardInset !== keyboardInset
      const sentFold = message.foldDivision ?? null
      const movedFold = held !== null && !sameFoldDivision(held.foldDivision, sentFold)
      const foldDivision = held === null || movedFold ? sentFold : held.foldDivision
      const sentRail = message.terminalKeyRail ?? []
      const movedRail = held !== null && !sameTerminalKeyRail(held.terminalKeyRail, sentRail)
      const terminalKeyRail = held === null || movedRail ? sentRail : held.terminalKeyRail
      session =
        update === null
          ? { ...readShellSession(message), safeAreaInsets, foldDivision, terminalKeyRail }
          : {
              ...update,
              route: message.route ?? null,
              safeAreaInsets,
              keyboardInset,
              foldDivision,
              terminalKeyRail
            }
      // Reprime on every init to repair refused stale generations after client rebuild; identical pane-update snapshots emit no transition.
      args.prime(message.connection)
      for (const listener of readyListeners) {
        listener()
      }
      readyListeners.clear()
      if (movedInsets) {
        for (const listener of insetsListeners) {
          listener(safeAreaInsets)
        }
      }
      if (movedKeyboard) {
        for (const listener of keyboardListeners) {
          listener(keyboardInset)
        }
      }
      if (movedFold) {
        for (const listener of foldListeners) {
          listener(foldDivision)
        }
      }
      if (movedRail) {
        for (const listener of railListeners) {
          listener(terminalKeyRail)
        }
      }
      // Publish only changed routes; repeated ready used for state repair must not retrigger the current pane.
      if (update === null || !bridgeRouteMoved(update.route, session.route)) {
        return
      }
      for (const listener of routeUpdateListeners) {
        listener(session.route)
      }
    },
    onReady: (listener) => {
      if (session !== null) {
        listener()
        return () => undefined
      }
      readyListeners.add(listener)
      return () => {
        readyListeners.delete(listener)
      }
    },
    // Late listeners read current; updates report changes without replaying the held route.
    onRouteUpdate: (listener) => {
      routeUpdateListeners.add(listener)
      return () => {
        routeUpdateListeners.delete(listener)
      }
    },
    onSafeAreaInsetsUpdate: (listener) => {
      insetsListeners.add(listener)
      return () => {
        insetsListeners.delete(listener)
      }
    },
    onKeyboardInsetUpdate: (listener) => {
      keyboardListeners.add(listener)
      return () => {
        keyboardListeners.delete(listener)
      }
    },
    onFoldDivisionUpdate: (listener) => {
      foldListeners.add(listener)
      return () => {
        foldListeners.delete(listener)
      }
    },
    onTerminalKeyRailUpdate: (listener) => {
      railListeners.add(listener)
      return () => {
        railListeners.delete(listener)
      }
    },
    close: () => {
      session = null
      readyListeners.clear()
    }
  }
}
