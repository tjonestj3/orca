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
5. `chore(jarvis): personal TestFlight build` — bundle ID, name and icon via env, this workflow,
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
