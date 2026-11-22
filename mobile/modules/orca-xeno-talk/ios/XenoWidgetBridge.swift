import ActivityKit
import Foundation
import Security
import WidgetKit

// The app's side of Xeno's widgets (targets/XenoWidgets): where the desktop's glance is and the key to get in,
// kept where the widgets can read it, and the call's Live Activity.

let xenoCallActionNotification = Notification.Name("OrcaXenoCallAction")

// MARK: - Widget access

private let widgetService = "orca.xeno.widget"
private let widgetAccount = "access"

/// The keychain group the app shares with the widgets: "<team>.<app bundle id>.shared" (both targets' entitlements
/// name it). The team prefix isn't known at run time, so it's read off an item saved under the app's default group.
func xenoSharedKeychainGroup() -> String? {
  guard let bundle = Bundle.main.bundleIdentifier else { return nil }
  let probe: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: "orca.xeno.group-probe",
    kSecAttrAccount as String: "probe",
    kSecReturnAttributes as String: true,
  ]
  var found: CFTypeRef?
  var status = SecItemCopyMatching(probe as CFDictionary, &found)
  if status == errSecItemNotFound {
    var add = probe
    add[kSecValueData as String] = Data()
    add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    status = SecItemAdd(add as CFDictionary, &found)
  }
  guard status == errSecSuccess,
        let attributes = found as? [String: Any],
        let group = attributes[kSecAttrAccessGroup as String] as? String,
        let dot = group.firstIndex(of: ".")
  else {
    return nil
  }
  return "\(group[..<dot]).\(bundle).shared"
}

/// Saves the widgets' access ({"glance": url, "key": …, "host": name}) and has them reload if it changed.
/// Readable after the first unlock, so the widgets can refresh while the phone is locked.
func writeXenoWidgetAccess(_ json: String) -> Bool {
  guard let group = xenoSharedKeychainGroup(), let data = json.data(using: .utf8) else { return false }
  let item: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: widgetService,
    kSecAttrAccount as String: widgetAccount,
    kSecAttrAccessGroup as String: group,
  ]
  var read = item
  read[kSecReturnData as String] = true
  var found: CFTypeRef?
  if SecItemCopyMatching(read as CFDictionary, &found) == errSecSuccess, (found as? Data) == data {
    return true
  }
  let values: [String: Any] = [
    kSecValueData as String: data,
    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
  ]
  var status = SecItemUpdate(item as CFDictionary, values as CFDictionary)
  if status == errSecItemNotFound {
    status = SecItemAdd(item.merging(values) { $1 } as CFDictionary, nil)
  }
  if status == errSecSuccess {
    WidgetCenter.shared.reloadAllTimelines()
  }
  return status == errSecSuccess
}

// MARK: - The call's Live Activity

// Must match targets/XenoWidgets/CallLiveActivity.swift field for field: iOS pairs the two by name.
@available(iOS 16.1, *)
struct XenoCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var phase: String
    var heard: String
    var holding: Bool
  }

  var host: String
  var startedAt: Date
}

/// Starts the call's Live Activity, updates it, or (phase nil) ends it. Only one at a time.
@available(iOS 16.2, *)
func setXenoCallActivity(phase: String?, heard: String, holding: Bool, host: String) {
  let running = Activity<XenoCallAttributes>.activities
  guard let phase else {
    for activity in running {
      Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }
    return
  }
  let content = ActivityContent(
    state: XenoCallAttributes.ContentState(phase: phase, heard: heard, holding: holding), staleDate: nil)
  if let activity = running.first {
    Task { await activity.update(content) }
    for extra in running.dropFirst() {
      Task { await extra.end(nil, dismissalPolicy: .immediate) }
    }
    return
  }
  guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
  // Starting needs the app in front, as it is when a call starts; updates work from the background.
  _ = try? Activity.request(
    attributes: XenoCallAttributes(host: host, startedAt: Date()), content: content, pushType: nil)
}
