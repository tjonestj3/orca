# Orca Jarvis (personal build)

Personal TestFlight build of Orca mobile with a Jarvis voice screen: talk to the Jarvis voice server
that runs beside Orca on the paired desktop (`tjonestj3`'s `claude-voice-ios` repo, `brain/`).
Not for upstream: this branch also deletes upstream CI so pushes here don't run their whole pipeline.

|                  |                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------- |
| Branch           | `jarvis-voice` on `tjonestj3/orca`, cut from `upstream/main` on 2026-11-11          |
| Bundle ID        | `com.krahnborn.orca.duo` (the Duo beta's App ID; repo variable overrides it)        |
| Home-screen name | Xeno, gold "III" on dark icon (`mobile/assets/icon-jarvis.png`)                     |
| Build            | `.github/workflows/duo-beta-ios.yml` (the Duo path GitHub knows) on push or by hand |
| Signing          | Same repo secrets as the Duo beta (see the duo-beta branch's DUO_BETA.md)           |

## Commits on top of upstream

1. `feat(mobile): talk to Jarvis` — the Jarvis screen (`src/jarvis/`), opened from a computer's
   long-press menu or `orca://h/<hostId>/jarvis`; WebRTC via `react-native-webrtc`; the call plays on
   the loudspeaker unless headphones, Bluetooth or CarPlay are connected.
2. `feat(mobile): Jarvis worktree cards and list` — cards for the worktrees in the conversation open
   them in Orca; the list asks Jarvis for an update on tap, or to talk about it / message its agent / open
   it on touch and hold.
3. `feat(mobile): play Jarvis's messages again` — a play-last button beside the talk button and a
   Messages tab listing what Jarvis said (its answers and the agent updates it read out); a tap says
   it again, queued behind anything playing, or opens a call that starts with it. Needs the Jarvis
   server's `/api/jarvis/history` and `jarvis-replay` (the `voice-log-review` brain PR).
4. `feat(mobile): Jarvis everywhere` — one app-wide call (`JarvisProvider`), hold-to-talk bubble on every
   screen (rail orb on the folded iPhone Duo), hands-free switch, background audio (`UIBackgroundModes:
   audio`), "what I'm looking at" context, floating-workspace cards. Needs the `jarvis-everywhere` brain.
5. `feat(jarvis): the conversation as a chat transcript` — the Messages tab becomes Conversation (chat
   bubbles, both sides, full text; tap Jarvis's lines to replay, hold to copy), also full screen from the
   captions or the nav bar. Plus fixes: a tap on the bubble no longer starts a call, chat dictation ends a
   live call first, and the reachability check uses `/api/jarvis/ping`. Needs the matching brain.
6. `feat(jarvis): Hey Xeno` — the assistant is called Xeno in the app; a "Hey Xeno" switch beside Hands-free
   keeps the mic on but Xeno answers only when named (the brain's wake mode), and the orb turns purple when it
   picks a turn up. On the folded Duo, Xeno is the first of a worktree's shortcut keys instead of covering them.
7. `feat(jarvis): Xeno follows the desktop you're in` — each paired desktop runs its own Xeno; the bubble and
   rail orb talk to the one you're in (else the last one, else the only one running), ask once when it's
   ambiguous, keep a live call on its desktop, and show the desktop's name.
8. `feat(jarvis): Talk to Xeno from the Action Button` — an App Intent written into the app target at prebuild
   (`plugins/ios-xeno-talk-intent.js`) plus `modules/orca-xeno-talk`, which hands each press to JS. Assign it in
   Settings → Action Button → Shortcut → Xeno → Talk to Xeno; also "Talk to Xeno" in Shortcuts and Siri.
9. `feat(jarvis): show Xeno hearing a Hey Xeno turn while you talk` — purple and moving with your voice as soon
   as the brain says a turn counts (`jarvis-hearing`), amber thinking once you stop, back to listening if the brain
   takes it back (`jarvis-dropped`). Needs the brain from `7efa655`.
10. `feat(jarvis): keep Hey Xeno waiting with the phone locked, and report why it stops` — an hour's idle hang-up
   in Hey Xeno mode, and lock/unlock, audio interruptions, route changes and app state sent to the brain's log
   (`jarvis-device`, via `modules/orca-xeno-talk`), to find what stops a locked call hearing you.
11. `feat(jarvis): open an agent's Claude artifacts in the Claude app` — an Open in Claude button on cards and list
   rows, and `jarvis-open-artifact` from the brain's `open_artifact` tool. Needs the brain from `94d36c1`.
12. `chore(jarvis): personal TestFlight build` — bundle ID, name and icon via env, this workflow,
   upstream CI removed, this file.

The Jarvis server must be running on the desktop (`systemctl --user status jarvis`) and reachable
over Tailscale on port 7860.

## Upstream PRs carried here

- stablyai/orca#36352 (luben93, open): foreground and network-change nudges keep a failing host's
  reconnect backoff, and a never-connected host goes dormant after its attempt limit. Refs #13354:
  Orca over Tailscale on iOS stalling until Tailscale is toggled, possibly triggered by redialing an
  offline peer (tailscale/tailscale#17967). Ported onto the transport/rpc layout from #39846; its edit
  to the old rpc-client.test.ts was dropped because upstream removed that test. Drop these two
  commits once the PR merges upstream.
