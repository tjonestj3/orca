import AVFoundation
import ExpoModulesCore
import ObjectiveC
import UIKit
import WidgetKit

// The Talk to Xeno App Intent lives in the app target (plugins/ios-xeno-talk-intent.js). It leaves a pending press
// in UserDefaults and posts a notification; this hands the press to JS, now or once JS asks after starting up.
let xenoTalkRequested = Notification.Name("OrcaXenoTalkRequested")
let xenoTalkPendingKey = "orca.xenoTalkPending"

// Whether a Xeno call is live, and the talk button held, for the Talk to Xeno App Intent: while a call is live it
// runs without opening the app (the app is already running, its call audio active) and just toggles talking.
// Stamped with this process, so a record left from before the app was closed doesn't count as a live call.
let xenoCallLiveKey = "orca.xenoCallLive"
let xenoCallHoldingKey = "orca.xenoCallHolding"
let xenoCallProcessKey = "orca.xenoCallProcess"

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

// Music from other apps through a call (on the Xeno screen): WebRTC's audio configuration, applied as its audio
// starts, mixes with other audio and keeps Bluetooth headphones in music quality (A2DP out, the phone's own
// microphone in) instead of call quality. Off, it goes back to WebRTC's own: a call stops other audio, as a phone
// call does. False when WebRTC's configuration class isn't there.
private var webRTCOptions: UInt?
let hfpOption: UInt = 0x4  // allowBluetooth, renamed allowBluetoothHFP in iOS 26

func musicMixing(_ on: Bool) -> Bool {
  let getter = NSSelectorFromString("webRTCConfiguration")
  let setter = NSSelectorFromString("setWebRTCConfiguration:")
  guard let type: AnyClass = NSClassFromString("RTCAudioSessionConfiguration"),
        let get = class_getClassMethod(type, getter),
        let set = class_getClassMethod(type, setter)
  else {
    return false
  }
  typealias GetConfig = @convention(c) (AnyObject, Selector) -> Unmanaged<AnyObject>
  typealias PutConfig = @convention(c) (AnyObject, Selector, AnyObject) -> Void
  let config = unsafeBitCast(method_getImplementation(get), to: GetConfig.self)(type as AnyObject, getter)
    .takeUnretainedValue()
  guard let object = config as? NSObject,
        let current = (object.value(forKey: "categoryOptions") as? NSNumber)?.uintValue
  else {
    return false
  }
  let original = webRTCOptions ?? current
  webRTCOptions = original
  let mixing = (original & ~hfpOption) | AVAudioSession.CategoryOptions.mixWithOthers.rawValue
    | AVAudioSession.CategoryOptions.allowBluetoothA2DP.rawValue
  object.setValue(NSNumber(value: on ? mixing : original), forKey: "categoryOptions")
  unsafeBitCast(method_getImplementation(set), to: PutConfig.self)(type as AnyObject, setter, object)
  return true
}

// Turns other audio down under Xeno, or back up. Ducking ends only once the session is activated again with the
// option gone, so that happens on the way back up. Says what iOS did, for Xeno's server log.
func duckOtherAudio(_ on: Bool) -> [String: Any] {
  let session = AVAudioSession.sharedInstance()
  var options = session.categoryOptions
  guard options.contains(.mixWithOthers) else {
    return ["on": on, "ok": false, "why": "not mixing"]
  }
  if on {
    options.insert(.duckOthers)
  } else {
    options.remove(.duckOthers)
  }
  do {
    try session.setCategory(session.category, mode: session.mode, options: options)
    if !on {
      try session.setActive(true)
    }
    return ["on": on, "ok": true, "otherAudio": session.isOtherAudioPlaying,
            "silenceHint": session.secondaryAudioShouldBeSilencedHint]
  } catch {
    return ["on": on, "ok": false, "why": error.localizedDescription]
  }
}

public class OrcaXenoTalkModule: Module {
  private var observer: NSObjectProtocol?
  private var callActionObserver: NSObjectProtocol?
  private var deviceObservers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("OrcaXenoTalk")
    Events("onTalk", "onDevice", "onCallAction")

    // A call left marked live by an app that was closed isn't one: the Talk to Xeno shortcut would think it could
    // toggle talking without opening the app.
    OnCreate {
      UserDefaults.standard.set(false, forKey: xenoCallLiveKey)
      UserDefaults.standard.set(false, forKey: xenoCallHoldingKey)
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: xenoTalkRequested, object: nil, queue: .main
      ) { [weak self] _ in
        if takeXenoTalkPress() {
          self?.sendEvent("onTalk", [:])
        }
      }
      // A button on the call's Live Activity (targets/_shared/XenoWidgetIntents.swift).
      self.callActionObserver = NotificationCenter.default.addObserver(
        forName: xenoCallActionNotification, object: nil, queue: .main
      ) { [weak self] note in
        if let action = note.userInfo?["action"] as? String {
          self?.sendEvent("onCallAction", ["action": action])
        }
      }
      self.observeDevice()
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observer = nil
      if let observer = self.callActionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.callActionObserver = nil
      self.deviceObservers.forEach { NotificationCenter.default.removeObserver($0) }
      self.deviceObservers = []
    }

    Function("takePending") { () -> Bool in
      takeXenoTalkPress()
    }

    // What the last Talk to Xeno press found (live call, holding, its process), for Xeno's server log; taking it
    // clears it.
    Function("takeTrace") { () -> String? in
      let defaults = UserDefaults.standard
      let trace = defaults.string(forKey: "orca.xenoTalkTrace")
      defaults.removeObject(forKey: "orca.xenoTalkTrace")
      return trace
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

    Function("setTalkState") { (live: Bool, holding: Bool) in
      let defaults = UserDefaults.standard
      defaults.set(live, forKey: xenoCallLiveKey)
      defaults.set(holding, forKey: xenoCallHoldingKey)
      defaults.set(Int(ProcessInfo.processInfo.processIdentifier), forKey: xenoCallProcessKey)
    }

    // Before a call starts: whether music from other apps keeps playing through it.
    Function("setMusicMixing") { (on: Bool) -> Bool in
      musicMixing(on)
    }

    // Where the widgets fetch Xeno's glance, and the key to get in (JSON: glance, key, host).
    Function("shareWidgetAccess") { (json: String) -> Bool in
      writeXenoWidgetAccess(json)
    }

    Function("reloadWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }

    // The call's Live Activity: started, updated, or (phase nil) ended.
    Function("setCallActivity") { (phase: String?, heard: String, holding: Bool, host: String) in
      if #available(iOS 16.2, *) {
        setXenoCallActivity(phase: phase, heard: heard, holding: holding, host: host)
      }
    }

    Function("duckMusic") { (on: Bool) -> Bool in
      var note = duckOtherAudio(on)
      note["kind"] = "music-duck"
      note["at"] = Date().timeIntervalSince1970 * 1000
      self.sendEvent("onDevice", note)
      return note["ok"] as? Bool ?? false
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
