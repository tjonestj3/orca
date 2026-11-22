import Foundation
import Security
import SwiftUI
import WidgetKit

// What the widgets show: the desktop Xeno's glance (GET /api/jarvis/glance), fetched with the address and key the
// app keeps in the keychain group it shares with them.

struct Glance: Codable {
  struct Ask: Codable, Hashable {
    var who: String
    var text: String
    var since: Double?
  }

  struct Artifact: Codable, Hashable {
    var title: String
    var url: String
  }

  struct Worktree: Codable, Hashable {
    var name: String
    var state: String
    var line: String?
    var artifact: Artifact?
  }

  struct Reply: Codable, Hashable {
    var text: String
    var at: Double?
  }

  var at: Double?
  var needsYou: [Ask]?
  var worktrees: [Worktree]?
  var limitResets: String?
  var lastReply: Reply?
  var call: Bool?

  var asks: [Ask] { needsYou ?? [] }
  var agents: [Worktree] { worktrees ?? [] }

  static let sample = Glance(
    at: Date().timeIntervalSince1970 * 1000,
    needsYou: [
      Ask(who: "orca-jarvis-next", text: "Wants to push to xeno-next", since: (Date().timeIntervalSince1970 - 720) * 1000),
      Ask(who: "Xeno", text: "Want me to start the build?", since: nil),
    ],
    worktrees: [
      Worktree(name: "orca-jarvis-next", state: "needs you", line: "Wants to run git push", artifact: nil),
      Worktree(name: "barge-in-no-wake-word", state: "working", line: "Writing the spoken-numbers tests", artifact: nil),
      Worktree(
        name: "elemental-tactician", state: "done", line: "Combo balance pass is published",
        artifact: Artifact(title: "Combo tuning", url: "https://claude.ai")),
    ],
    limitResets: nil,
    lastReply: Reply(text: "Decimals are fixed both ways.", at: nil),
    call: false
  )
}

/// Where the glance is and how to get in, as the app last wrote it.
struct XenoAccess: Codable {
  var glance: String
  var key: String?
  var host: String?

  // The app's keychain item (modules/orca-xeno-talk): no access group named, so the search covers the shared group,
  // the only one this extension has besides its own.
  static func read() -> XenoAccess? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "orca.xeno.widget",
      kSecAttrAccount as String: "access",
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var found: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &found) == errSecSuccess, let data = found as? Data else {
      return nil
    }
    return try? JSONDecoder().decode(XenoAccess.self, from: data)
  }
}

enum GlanceState {
  case ready(Glance)
  /// Not paired yet: the app hasn't shared a desktop with the widgets.
  case unpaired
  /// The desktop didn't answer; the last glance it gave, if any, with when.
  case away(Glance?)
}

struct GlanceEntry: TimelineEntry {
  let date: Date
  let state: GlanceState
  let host: String?

  var glance: Glance? {
    switch state {
    case .ready(let glance): return glance
    case .away(let glance): return glance
    case .unpaired: return nil
    }
  }

  var unpaired: Bool {
    if case .unpaired = state { return true }
    return false
  }

  var stale: Bool {
    if case .away = state { return true }
    return false
  }

  static let sample = GlanceEntry(date: Date(), state: .ready(.sample), host: "Desktop")
}

enum GlanceLoader {
  private static let cacheKey = "xeno.glance.last"

  static func load() async -> GlanceEntry {
    guard let access = XenoAccess.read(), let url = URL(string: access.glance) else {
      return GlanceEntry(date: Date(), state: .unpaired, host: nil)
    }
    var request = URLRequest(url: url, timeoutInterval: 10)
    if let key = access.key, !key.isEmpty {
      request.setValue(key, forHTTPHeaderField: "X-Xeno-Key")
    }
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
      let glance = try JSONDecoder().decode(Glance.self, from: data)
      UserDefaults.standard.set(data, forKey: cacheKey)
      return GlanceEntry(date: Date(), state: .ready(glance), host: access.host)
    } catch {
      let cached = UserDefaults.standard.data(forKey: cacheKey).flatMap {
        try? JSONDecoder().decode(Glance.self, from: $0)
      }
      return GlanceEntry(date: Date(), state: .away(cached), host: access.host)
    }
  }
}

struct GlanceProvider: TimelineProvider {
  func placeholder(in context: Context) -> GlanceEntry { .sample }

  func getSnapshot(in context: Context, completion: @escaping (GlanceEntry) -> Void) {
    if context.isPreview {
      completion(.sample)
      return
    }
    Task { completion(await GlanceLoader.load()) }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<GlanceEntry>) -> Void) {
    Task {
      let entry = await GlanceLoader.load()
      // iOS decides when it actually reloads; the app also asks for a reload whenever it's opened.
      let next = Date().addingTimeInterval(entry.stale ? 5 * 60 : 15 * 60)
      completion(Timeline(entries: [entry], policy: .after(next)))
    }
  }
}

// Xeno's colours (the orb's teal on the app's navy).
enum Xeno {
  static let navy = Color(red: 0x0A / 255, green: 0x16 / 255, blue: 0x28 / 255)
  static let surface = Color(red: 0x0F / 255, green: 0x1E / 255, blue: 0x36 / 255)
  static let raised = Color(red: 0x16 / 255, green: 0x29 / 255, blue: 0x4A / 255)
  static let teal = Color(red: 0x99 / 255, green: 0xD5 / 255, blue: 0xCA / 255)
  static let tealDeep = Color(red: 0x4F / 255, green: 0xA8 / 255, blue: 0x9A / 255)
  static let amber = Color(red: 0xE8 / 255, green: 0xC1 / 255, blue: 0x6B / 255)
  static let green = Color(red: 0x5F / 255, green: 0xD6 / 255, blue: 0xA6 / 255)
  static let text = Color(red: 0xE9 / 255, green: 0xEF / 255, blue: 0xF6 / 255)
  static let secondary = Color(red: 0x97 / 255, green: 0xA6 / 255, blue: 0xBC / 255)

  static func stateColor(_ state: String) -> Color {
    switch state {
    case "needs you": return amber
    case "working": return teal
    case "done": return green
    default: return secondary
    }
  }

  static func stateLabel(_ state: String) -> String {
    switch state {
    case "needs you": return "YOU"
    case "working": return "WORKING"
    case "done": return "DONE"
    default: return "IDLE"
    }
  }
}

/// The orb, drawn flat: a teal core fading into navy.
struct OrbView: View {
  var size: CGFloat
  var glowing = false

  var body: some View {
    Circle()
      .fill(
        RadialGradient(
          colors: [Xeno.teal, Xeno.tealDeep, Xeno.raised],
          center: .center, startRadius: 0, endRadius: size / 2)
      )
      .frame(width: size, height: size)
      .shadow(color: glowing ? Xeno.teal.opacity(0.5) : .clear, radius: size / 4)
  }
}

/// "12 min", "3 h": how long something has waited.
func waited(since ms: Double?, now: Date) -> String? {
  guard let ms else { return nil }
  let minutes = max(0, Int(now.timeIntervalSince1970 - ms / 1000) / 60)
  if minutes < 1 { return "now" }
  if minutes < 60 { return "\(minutes) min" }
  return "\(minutes / 60) h"
}
