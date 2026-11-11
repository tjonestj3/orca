// Bare expo-notifications defaults to sandbox entitlements while non-dev push-token.ts reports production, silently losing TestFlight/App Store pushes.
// Derive APNs mode from release workflow env; Expo still supplies app.json, including Fastlane version/buildNumber rewrites, for everything else.
const APS_ENVIRONMENT =
  process.env.ORCA_IOS_APS_ENVIRONMENT === 'production' ? 'production' : 'development'
// Personal builds sign under their own App ID and install beside the store app; unset keeps app.json.
const IOS_BUNDLE_IDENTIFIER = process.env.IOS_BUNDLE_IDENTIFIER
const IOS_APP_NAME = process.env.ORCA_IOS_APP_NAME
const IOS_ICON = process.env.ORCA_IOS_ICON

module.exports = ({ config }) => ({
  ...config,
  // `expo run` installs a dev-client build cached for the current native fingerprint instead of
  // rebuilding; scripts/native-client.mjs populates the cache.
  buildCacheProvider: { plugin: './scripts/native-build-cache.cjs' },
  ios: {
    ...config.ios,
    ...(IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: IOS_BUNDLE_IDENTIFIER } : {}),
    ...(IOS_ICON ? { icon: IOS_ICON } : {}),
    // Home-screen label only: renaming `name` would rename the Xcode project fastlane builds.
    ...(IOS_APP_NAME
      ? { infoPlist: { ...config.ios?.infoPlist, CFBundleDisplayName: IOS_APP_NAME } }
      : {}),
    entitlements: { ...config.ios?.entitlements, 'aps-environment': APS_ENVIRONMENT }
  },
  plugins: (config.plugins ?? []).map((plugin) =>
    plugin === 'expo-notifications'
      ? [
          'expo-notifications',
          {
            enableBackgroundRemoteNotifications: true,
            mode: APS_ENVIRONMENT,
            icon: './assets/notification-icon.png'
          }
        ]
      : plugin
  )
})
