import ExpoModulesCore

// The Talk to Xeno App Intent lives in the app target (plugins/ios-xeno-talk-intent.js). It leaves a pending press
// in UserDefaults and posts a notification; this hands the press to JS, now or once JS asks after starting up.
let xenoTalkRequested = Notification.Name("OrcaXenoTalkRequested")
let xenoTalkPendingKey = "orca.xenoTalkPending"

func takeXenoTalkPress() -> Bool {
  let defaults = UserDefaults.standard
  guard defaults.bool(forKey: xenoTalkPendingKey) else { return false }
  defaults.set(false, forKey: xenoTalkPendingKey)
  return true
}

public class OrcaXenoTalkModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("OrcaXenoTalk")
    Events("onTalk")

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: xenoTalkRequested, object: nil, queue: .main
      ) { [weak self] _ in
        if takeXenoTalkPress() {
          self?.sendEvent("onTalk", [:])
        }
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
    }

    Function("takePending") { () -> Bool in
      takeXenoTalkPress()
    }
  }
}
