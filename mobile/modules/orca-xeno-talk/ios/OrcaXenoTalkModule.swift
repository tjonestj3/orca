import AVFoundation
import ExpoModulesCore
import UIKit

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
  private var deviceObservers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("OrcaXenoTalk")
    Events("onTalk", "onDevice")

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: xenoTalkRequested, object: nil, queue: .main
      ) { [weak self] _ in
        if takeXenoTalkPress() {
          self?.sendEvent("onTalk", [:])
        }
      }
      self.observeDevice()
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
      self.deviceObservers.forEach { NotificationCenter.default.removeObserver($0) }
      self.deviceObservers = []
    }

    Function("takePending") { () -> Bool in
      takeXenoTalkPress()
    }
  }

  // Locking, unlocking and the audio session's interruptions and route changes, for Xeno's server log: they show
  // why a call stops hearing the person while the phone is locked. Each carries when it happened, since a
  // suspended app hands them over late.
  private func observeDevice() {
    guard deviceObservers.isEmpty else { return }
    let center = NotificationCenter.default
    let report: (String, [String: Any?]) -> Void = { [weak self] kind, extra in
      var body = extra
      body["kind"] = kind
      body["at"] = Date().timeIntervalSince1970 * 1000
      self?.sendEvent("onDevice", body)
    }
    deviceObservers = [
      center.addObserver(
        forName: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil, queue: .main
      ) { _ in report("locked", [:]) },
      center.addObserver(
        forName: UIApplication.protectedDataDidBecomeAvailableNotification, object: nil, queue: .main
      ) { _ in report("unlocked", [:]) },
      center.addObserver(
        forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
      ) { note in
        let info = note.userInfo ?? [:]
        let type = info[AVAudioSessionInterruptionTypeKey] as? UInt
        if type == AVAudioSession.InterruptionType.began.rawValue {
          var extra: [String: Any?] = [:]
          if let reason = info[AVAudioSessionInterruptionReasonKey] as? UInt {
            extra["reason"] = reason  // 0 default, 1 app was suspended, 2 built-in mic muted
          }
          report("audio-interrupted", extra)
        } else {
          let options = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
          let shouldResume = AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume)
          report("audio-resumed", ["shouldResume": shouldResume])
        }
      },
      center.addObserver(
        forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
      ) { note in
        let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
        let outputs = AVAudioSession.sharedInstance().currentRoute.outputs.map { $0.portType.rawValue }
        report("audio-route", ["reason": reason, "outputs": outputs.joined(separator: ",")])
      },
      center.addObserver(
        forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main
      ) { _ in report("audio-services-reset", [:]) },
    ]
  }
}
