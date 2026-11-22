import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// A Xeno call on the lock screen and in the Dynamic Island. The app starts, updates and ends it
// (modules/orca-xeno-talk), whose copy of these attributes must match this one field for field.
struct XenoCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// connecting, listening, hearing, thinking or speaking
    var phase: String
    /// The last thing Xeno heard you say.
    var heard: String
    /// The talk button is held: the next press sends.
    var holding: Bool
  }

  var host: String
  var startedAt: Date
}

struct XenoCallLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: XenoCallAttributes.self) { context in
      CallLockScreenView(context: context)
        .activityBackgroundTint(Xeno.navy.opacity(0.92))
        .activitySystemActionForegroundColor(Xeno.text)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          OrbView(size: 36, glowing: context.state.phase == "speaking").padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.attributes.startedAt, style: .timer)
            .font(.system(size: 12, design: .monospaced)).foregroundStyle(Xeno.secondary)
            .multilineTextAlignment(.trailing).frame(maxWidth: 64)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(CallWords.title(context.state.phase)).font(.headline).foregroundStyle(Xeno.text)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 10) {
            if !context.state.heard.isEmpty {
              Text("“\(context.state.heard)”").font(.subheadline).foregroundStyle(Xeno.text.opacity(0.85))
                .lineLimit(2)
            }
            CallButtons(holding: context.state.holding)
          }
        }
      } compactLeading: {
        OrbView(size: 20)
      } compactTrailing: {
        CallLevel(phase: context.state.phase)
      } minimal: {
        OrbView(size: 18)
      }
      .keylineTint(Xeno.teal)
    }
  }
}

enum CallWords {
  static func title(_ phase: String) -> String {
    switch phase {
    case "connecting": return "Xeno is connecting"
    case "hearing": return "Xeno hears you"
    case "thinking": return "Xeno is thinking"
    case "speaking": return "Xeno is speaking"
    default: return "Xeno is listening"
    }
  }
}

/// The compact island's right side: bars while you talk or Xeno speaks, a spinner-ish ring while it thinks.
struct CallLevel: View {
  let phase: String

  var body: some View {
    if phase == "thinking" || phase == "connecting" {
      Image(systemName: "ellipsis").font(.system(size: 14, weight: .bold)).foregroundStyle(Xeno.teal)
    } else {
      HStack(spacing: 2) {
        ForEach(Array(heights.enumerated()), id: \.offset) { _, height in
          Capsule().fill(Xeno.teal).frame(width: 3, height: height)
        }
      }
    }
  }

  private var heights: [CGFloat] {
    phase == "hearing" || phase == "speaking" ? [6, 14, 9, 16] : [4, 6, 4, 6]
  }
}

struct CallButtons: View {
  let holding: Bool

  var body: some View {
    HStack(spacing: 8) {
      Button(intent: XenoCallActionIntent(action: "talk")) {
        Text(holding ? "Send" : "Talk").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(Xeno.teal)
      .foregroundStyle(Xeno.navy)
      Button(intent: XenoCallActionIntent(action: "end")) {
        Image(systemName: "xmark").font(.subheadline.weight(.bold))
      }
      .buttonStyle(.borderedProminent)
      .tint(Color(red: 0xC4 / 255, green: 0x4A / 255, blue: 0x38 / 255))
      .accessibilityLabel("End call")
    }
  }
}

struct CallLockScreenView: View {
  let context: ActivityViewContext<XenoCallAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        OrbView(size: 34, glowing: context.state.phase == "speaking")
        VStack(alignment: .leading, spacing: 1) {
          Text(CallWords.title(context.state.phase)).font(.headline).foregroundStyle(Xeno.text)
          HStack(spacing: 4) {
            Text(context.attributes.startedAt, style: .timer)
            Text("· \(context.attributes.host)")
          }
          .font(.system(size: 11, design: .monospaced)).foregroundStyle(Xeno.secondary)
        }
        Spacer()
        CallLevel(phase: context.state.phase)
      }
      if !context.state.heard.isEmpty {
        Text("“\(context.state.heard)”").font(.subheadline).foregroundStyle(Xeno.text.opacity(0.85)).lineLimit(2)
      }
      CallButtons(holding: context.state.holding)
    }
    .padding(16)
  }
}
