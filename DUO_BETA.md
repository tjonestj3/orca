# Orca Duo Beta (personal build)

Personal iPhone Duo build of Orca, phone and desktop, until upstream ships #35177.
Not for upstream: this branch also deletes upstream CI so pushes here don't run their whole pipeline.

|                  |                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Branch           | `duo-beta` on `tjonestj3/orca` (old #32733-based build kept as `duo-beta-v1`)            |
| Base             | stablyai/orca#35177 (`upstream/iphone-duo-workspace`): #33221 + #33210 carried onto main |
| Bundle ID        | `com.krahnborn.orca.duo` (repo variable `IOS_BUNDLE_IDENTIFIER` overrides)               |
| Home-screen name | Orca Duo (installs beside the App Store Orca)                                            |
| Icon             | `mobile/assets/icon-duo-beta.png`: stock orca recolored onto green (`ORCA_IOS_ICON`)     |
| Phone build      | `.github/workflows/duo-beta-ios.yml`, GitHub `xcode-27` runner → TestFlight (~30 min)    |
| Desktop          | "Orca Duo Desktop" in the app menu (`~/.local/bin/orca-duo-desktop`), see below          |
| Signing material | `~/dev/orca-duo-signing/` (local only, never committed)                                  |

## Commits on top of #35177

1. `chore(duo-beta): personal TestFlight build` (bundle ID/name/icon via env, own workflow, upstream CI removed, this file)
2. `chore(duo-beta): green app icon`

Our own fixes from `duo-beta-v1` (camera corner, one-tree status column area, reopening the last screen, draggable
sidebar) are not carried over. Port one only if #35177 still shows the problem on the Duo.

## The Duo desktop

Most of what #35177 changes on the phone (the session screen, its tabs, split panes and the key rail inside it) is
drawn by pages the desktop serves, so the phone needs a desktop built from the same branch. It runs in dev mode with
its own profile, beside the stock auto-updating Orca, which it never touches.

- **Open it:** "Orca Duo Desktop" in the app menu, or `orca-duo-desktop` in a terminal. Takes ~30 s to start.
- **Profile:** `~/.config/orca-duo-dev`, seeded 2026-10-28 from `~/.config/orca`: repos, workspaces, settings, SSH
  targets and the Orca sign-in. Its terminals and daemon are its own; automations were not copied (they would run
  twice). Workspaces added later in one app don't appear in the other. Reseed:
  `pnpm dev:seed-profile --from=$HOME/.config/orca --to=$HOME/.config/orca-duo-dev --reset`.
- **Both at once:** fine. They share the repos and worktrees on disk, not tabs or terminals. Don't run agents from
  both apps in the same worktree at once.
- **Phone:** in Orca Duo, add this desktop as another computer by scanning its pairing QR code (Settings → Mobile in
  the Duo desktop). Keep the stock desktop paired too if you like; it serves the older pages.
- **After pulling new commits:** `pnpm install && pnpm build:mobile-web`, then reopen it.
- The 2026-10-26 trial profile is at `~/.config/orca-duo-dev.trial-2026-10-26`; safe to delete.

## Apple setup (one time)

1. **App ID**: developer.apple.com → Certificates, IDs & Profiles → Identifiers → + → App IDs → App.
   Bundle ID explicit `com.krahnborn.orca.duo`. Enable **Push Notifications** (the app's entitlements include `aps-environment`).
2. **Distribution certificate**: Certificates → + → **Apple Distribution** → upload
   `~/dev/orca-duo-signing/apple-distribution.certSigningRequest` → download the `.cer` into that folder.
3. **App record**: App Store Connect → Apps → + New App. iOS, any unique name (e.g. "Orca Duo TJ"),
   bundle ID from step 1, any SKU.
4. **API key**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +.
   Role **Admin** (fastlane creates the provisioning profile through it). Download the `.p8` (one-time download)
   into `~/dev/orca-duo-signing/`, and note the **Key ID** and **Issuer ID**.
5. **TestFlight group**: the app → TestFlight → Internal Testing → + group, add yourself,
   tick **Enable automatic distribution**.
6. Team ID: Membership details page (10 characters).
7. **Enable Actions on the fork** (GitHub never runs workflows on a fork until you do):
   https://github.com/tjonestj3/orca/actions → "I understand my workflows, go ahead and enable them".

## Repo secrets (`gh secret set -R tjonestj3/orca …`)

| Secret                   | Value                                               |
| ------------------------ | --------------------------------------------------- |
| `ASC_KEY_ID`             | API key ID                                          |
| `ASC_ISSUER_ID`          | Issuer ID                                           |
| `ASC_API_KEY_P8`         | base64 of the `.p8`                                 |
| `APPLE_TEAM_ID`          | Team ID                                             |
| `IOS_DIST_CERT_P12`      | base64 of the `.p12` built from `dist.key` + `.cer` |
| `IOS_DIST_CERT_PASSWORD` | the `.p12` password                                 |

Build the `.p12` with legacy encryption, or macOS `security import` on the runner rejects it:
`openssl pkcs12 -export -legacy -inkey dist.key -in distribution.pem -out dist.p12`

## Refreshing from upstream

```sh
git fetch upstream iphone-duo-workspace
git rebase upstream/iphone-duo-workspace   # our two commits; resolve workflow deletions by keeping only ours
git push fork duo-beta --force-with-lease  # rebuilds the phone app
pnpm install && pnpm build:mobile-web       # then reopen the Duo desktop
```

When #35177 merges and stock Orca (desktop and App Store) ships it: delete Orca Duo, its App Store Connect record,
the launcher and `~/.config/orca-duo-dev`.

## Known limits

- Push notifications won't arrive: Orca's push service sends with Stably's APNs key for their bundle ID.
- Both apps register the `orca://` scheme; with both installed, iOS picks one for pairing links. Pair by scanning
  the QR code inside Orca Duo.
- Paired to the stock desktop, Orca Duo shows that desktop's older pages: no split panes, keys in the bottom row.
