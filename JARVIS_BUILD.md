# Orca Jarvis (personal build)

Personal TestFlight build of Orca mobile with a Jarvis voice screen: talk to the Jarvis voice server
that runs beside Orca on the paired desktop (`tjonestj3`'s `claude-voice-ios` repo, `brain/`).
Not for upstream: this branch also deletes upstream CI so pushes here don't run their whole pipeline.

|                  |                                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| Branch           | `jarvis-voice` on `tjonestj3/orca`, cut from `upstream/main` on 2026-11-11   |
| Bundle ID        | `com.krahnborn.orca.duo` (the Duo beta's App ID; repo variable overrides it) |
| Home-screen name | Orca Jarvis, green "III" icon (`mobile/assets/icon-jarvis.png`)              |
| Build            | `.github/workflows/jarvis-ios.yml` on push or by hand → TestFlight           |
| Signing          | Same repo secrets as the Duo beta (see the duo-beta branch's DUO_BETA.md)    |

## Commits on top of upstream

1. `feat(mobile): talk to Jarvis` — the Jarvis screen (`src/jarvis/`), opened from a computer's
   long-press menu or `orca://h/<hostId>/jarvis`; WebRTC via `react-native-webrtc`; the call plays on
   the loudspeaker unless headphones, Bluetooth or CarPlay are connected.
2. `chore(jarvis): personal TestFlight build` — bundle ID, name and icon via env, this workflow,
   upstream CI removed, this file.

The Jarvis server must be running on the desktop (`systemctl --user status jarvis`) and reachable
over Tailscale on port 7860.
