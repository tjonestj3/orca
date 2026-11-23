import AppIntents
import Foundation

// Built into both the app and the widgets (@bacons/apple-targets links a target's _shared folder to the app too): a widget button,
// a control or a Live Activity button names one of these, and iOS runs it in the app, where modules/orca-xeno-talk
// hands it to JS. The names and keys below match that module's.

/// What the app's own build adds to an intent that has to decide there (plugins/ios-xeno-talk-intent.js). The
/// widgets' build doesn't have it, and never runs these: iOS runs them in the app.
@available(iOS 17.0, *)
protocol XenoRunsInApp {
  @MainActor
  func runInApp() async throws
}

/// Talk to Xeno from a widget or a control. During a call it only presses talk (or sends, while held), and the app
/// stays in the background; with no call it opens Xeno, which starts one, listening.
@available(iOS 17.0, *)
struct XenoTalkIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Talk to Xeno"
  static let description = IntentDescription(
    "Start talking to Xeno; during a call, talk or send without opening the app.")
  static let isDiscoverable = false

  @MainActor
  func perform() async throws -> some IntentResult {
    try await (self as Any as? XenoRunsInApp)?.runInApp()
    return .result()
  }
}

/// An agent tapped in the Agents widget: opens its worktree in Xeno. It doesn't start a call; Talk to Xeno does.
@available(iOS 17.0, *)
struct XenoOpenAgentIntent: AppIntent {
  static let title: LocalizedStringResource = "Open an agent with Xeno"
  static let openAppWhenRun = true
  static let isDiscoverable = false

  @Parameter(title: "Worktree")
  var worktree: String

  init() {
    worktree = ""
  }

  init(worktree: String) {
    self.worktree = worktree
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(worktree, forKey: "orca.xenoOpenAgent")
    NotificationCenter.default.post(name: Notification.Name("OrcaXenoOpenAgent"), object: nil)
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
