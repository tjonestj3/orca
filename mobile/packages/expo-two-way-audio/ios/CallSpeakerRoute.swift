import AVFoundation

// A voice call on the loudspeaker instead of the earpiece; headphones, Bluetooth and CarPlay keep the audio.
final class CallSpeakerRoute {
    private var observer: NSObjectProtocol?

    func start() {
        stop()
        apply()
        observer = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.apply()
        }
    }

    func stop() {
        if let observer {
            NotificationCenter.default.removeObserver(observer)
        }
        observer = nil
        try? AVAudioSession.sharedInstance().overrideOutputAudioPort(.none)
    }

    // Only the earpiece is overridden, so the override's own route change settles on the speaker.
    private func apply() {
        let session = AVAudioSession.sharedInstance()
        let onEarpiece = session.currentRoute.outputs.contains { $0.portType == .builtInReceiver }
        if onEarpiece {
            try? session.overrideOutputAudioPort(.speaker)
        }
    }
}
