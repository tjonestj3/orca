# Orca Duo Beta (personal build)

Personal TestFlight build of Orca mobile with iPhone Duo support, until upstream ships it.
Not for upstream: this branch also deletes upstream CI so pushes here don't run their whole pipeline.

|                  |                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------- |
| Branch           | `duo-beta` on `tjonestj3/orca`                                                          |
| Base             | stablyai/orca#32733 (larskghf, "support iPhone Duo"), rebased onto `upstream/main`      |
| Bundle ID        | `com.krahnborn.orca.duo` (repo variable `IOS_BUNDLE_IDENTIFIER` overrides)              |
| Home-screen name | Orca Duo (installs beside the App Store Orca)                                           |
| Icon             | `mobile/assets/icon-duo-beta.png`: stock orca recolored onto green (`ORCA_IOS_ICON`)    |
| Build            | `.github/workflows/duo-beta-ios.yml`, GitHub `xcode-27` runner, Xcode 27.1 → TestFlight |
| Signing material | `~/dev/orca-duo-signing/` (local only, never committed)                                 |

## Commits on top of upstream

1. `chore(mobile): build iOS with the 27.1 SDK` (from #32733)
2. `feat(mobile): adapt to iPhone Duo folding and its status column` (from #32733)
3. `chore(duo-beta): personal TestFlight build` (bundle ID/name via env, own workflow, upstream CI removed, this file)

## Status

- [x] Rebased #32733 onto upstream main (2026-10-26, upstream `66fbd81994`)
  - Conflicts: comment-style churn in the mobile web-shell bridge, iOS workflow runner, `pnpm-workspace.yaml` patches. Kept both patches and upstream's two deleted grant tests stay deleted.
  - Mobile `tsc` clean, oxfmt clean, `pnpm install --frozen-lockfile` clean.
  - Vitest: 11149 passed. Remaining failures are environmental/pre-existing: 2 need Bun installed, `mobile-agent-launch-architecture.test.ts` fails identically on pristine upstream main.
- [x] Bundle ID + display name configurable by env (`IOS_BUNDLE_IDENTIFIER`, `ORCA_IOS_APP_NAME`); Fastfile reads `IOS_BUNDLE_IDENTIFIER`
- [x] Distribution key + CSR generated in `~/dev/orca-duo-signing/`
- [x] Pushed `duo-beta` to the fork (over SSH; the gh token lacks `workflow` scope for HTTPS pushes of workflow files)
- [x] Fork Actions enabled; the 9 workflows from the fork's stale June `main` disabled (`gh workflow enable` to undo)
- [x] App ID `com.krahnborn.orca.duo` registered with Push
- [x] Apple Distribution cert issued 2026-10-26 (expires 2027-10-26) from our CSR; `.p12` built in `~/dev/orca-duo-signing/`; Team ID LN2PTZ4HYL
- [ ] Secrets `IOS_DIST_CERT_P12`, `IOS_DIST_CERT_PASSWORD`, `APPLE_TEAM_ID` set (Thomas runs the `gh secret set` lines)
  - Don't revoke the June 2026 Apple Distribution cert: it's the Spell Volt/Codemagic one, key not here
- [ ] App Store Connect app record + API key → `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8`
- [ ] First CI build green
- [ ] Installed via TestFlight, tested on the Duo

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
git fetch upstream
git rebase upstream/main        # conflicts land in mobile/src/mobile-web-shell mostly
git push fork duo-beta --force-with-lease
```

If #32733 changes upstream: `git fetch upstream pull/32733/head:pr-32733` and rebuild the first two commits from it.
Once upstream ships Duo support, delete the TestFlight app and switch back to the store build.

## Known limits

- Push notifications won't arrive: Orca's push service sends with Stably's APNs key for their bundle ID.
- The page-rendered screens (session, chat, worktree list) are served by the desktop app, which bundles them at
  build time (`pnpm build:mobile-web` in every desktop release script). A stock desktop ships pages without the
  Duo changes: full-screen and the native screens' fold layout work from the phone alone, but the terminal key rail
  and fold-aware page layout need a desktop build from this branch. Phase 2 if phase 1 looks good.
- Both apps register the `orca://` scheme; with both installed, iOS picks one for pairing links. Pair by scanning
  the QR code inside Orca Duo.
