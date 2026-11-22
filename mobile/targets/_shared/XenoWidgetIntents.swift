import AppIntents
import Foundation

// Built into both the app and the widgets (@bacons/apple-targets links targets/_shared to each): a widget button,
// a control or a Live Activity button names one of these, and iOS runs it in the app, where modules/orca-xeno-talk
// hands it to JS. The names and keys below match that module's.

/// Talk to Xeno from a widget or a control: opens Xeno and presses talk, as the Talk to Xeno shortcut does with no
/// call (a call starts, listening).
@available(iOS 17.0, *)
struct XenoTalkControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Talk to Xeno"
  static let description = IntentDescription("Open Xeno and start talking.")
  static let openAppWhenRun = true
  static let isDiscoverable = false

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(true, forKey: "orca.xenoTalkPending")
    NotificationCenter.default.post(name: Notification.Name("OrcaXenoTalkRequested"), object: nil)
    return .result()
  }
}

/// A button on the call's Live Activity (lock screen, Dynamic Island): "talk" presses talk (or sends, while held),
/// "end" hangs up. Runs in the app, which is live for the whole call.
@available(iOS 17.0, *)
struct XenoCallActionIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Xeno call action"
  static let isDiscoverable = false

  @Parameter(title: "Action")
  var action: String

  init() {
    action = "talk"
  }

  init(action: String) {
    self.action = action
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(action, forKey: "orca.xenoCallAction")
    NotificationCenter.default.post(
      name: Notification.Name("OrcaXenoCallAction"), object: nil, userInfo: ["action": action]
    )
    return .result()
  }
}
