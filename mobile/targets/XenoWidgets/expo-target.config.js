// Xeno's widgets: Needs you, Agents, Talk (home and lock screen, StandBy), the Talk control (Control Center,
// lock screen, Action button) and a call's Live Activity. Built into the app by @bacons/apple-targets at prebuild.
//
// The widgets read the desktop's address and the phone's Xeno key from a keychain group they share with the app
// (the app writes it: modules/orca-xeno-talk). A keychain group needs no App Group set up in the developer portal:
// every profile already allows the team's own groups.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'XenoWidgets',
  displayName: 'Xeno',
  bundleIdentifier: '.widgets',
  // Controls (Control Center, the Action button) need iOS 18; the iPhone Duo runs 27.
  deploymentTarget: '18.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  entitlements: {
    'keychain-access-groups': [`$(AppIdentifierPrefix)${config.ios.bundleIdentifier}.shared`]
  }
})
