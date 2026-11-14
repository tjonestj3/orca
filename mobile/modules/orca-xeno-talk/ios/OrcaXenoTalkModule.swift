import AVFoundation
import ExpoModulesCore
import ObjectiveC
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

// WebRTC's RTCAudioSession, looked up at run time so this module needn't link WebRTC: manual audio with audio
// disabled stops the call's audio unit, and enabling it again (and leaving manual audio) restarts it. False when
// the class or its properties aren't there, and the caller keeps the call's own microphone.
func callAudio(enabled: Bool, activate: Bool) -> Bool {
  let shared = NSSelectorFromString("sharedInstance")
  guard let type: AnyClass = NSClassFromString("RTCAudioSession"),
        let method = class_getClassMethod(type, shared)
  else {
    return false
  }
  typealias SharedInstance = @convention(c) (AnyObject, Selector) -> Unmanaged<AnyObject>
  let instance = unsafeBitCast(method_getImplementation(method), to: SharedInstance.self)(type as AnyObject, shared)
  guard let session = instance.takeUnretainedValue() as? NSObject,
        session.responds(to: NSSelectorFromString("setUseManualAudio:")),
        session.responds(to: NSSelectorFromString("setIsAudioEnabled:"))
  else {
    return false
  }
  if enabled {
    // The dictation engine deactivated the shared audio session as it finished; WebRTC needs it active.
    if activate {
      try? AVAudioSession.sharedInstance().setActive(true)
      let didActivate = NSSelectorFromString("audioSessionDidActivate:")
      if session.responds(to: didActivate) {
        session.perform(didActivate, with: AVAudioSession.sharedInstance())
      }
    }
    session.setValue(true, forKey: "isAudioEnabled")
    session.setValue(false, forKey: "useManualAudio")
  } else {
    session.setValue(false, forKey: "isAudioEnabled")
    session.setValue(true, forKey: "useManualAudio")
    // Balances the activation above, as CallKit apps do: the dictation engine takes the session over now.
    let didDeactivate = NSSelectorFromString("audioSessionDidDeactivate:")
    if session.responds(to: didDeactivate) {
      session.perform(didDeactivate, with: AVAudioSession.sharedInstance())
    }
  }
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

    // Holding the talk button with the phone's own dictation: the call's audio stops so the dictation engine
    // can have the microphone (two voice-processing units can't share it), and starts again after.
    Function("pauseCallAudio") { () -> Bool in
      callAudio(enabled: false, activate: false)
    }

    // activate is false when the call is ending: the flags go back, but nothing reactivates the audio session.
    Function("resumeCallAudio") { (activate: Bool) -> Bool in
      callAudio(enabled: true, activate: activate)
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
