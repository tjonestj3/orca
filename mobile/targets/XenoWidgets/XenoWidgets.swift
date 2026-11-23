import AppIntents
import SwiftUI
import WidgetKit

@main
struct XenoWidgetsBundle: WidgetBundle {
  var body: some Widget {
    XenoNeedsYouWidget()
    XenoAgentsWidget()
    XenoTalkWidget()
    XenoTalkControl()
    XenoCallLiveActivity()
  }
}

// MARK: - Needs you

/// What's waiting on you: agents' asks and Xeno's own questions, oldest first.
struct XenoNeedsYouWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "XenoNeedsYou", provider: GlanceProvider()) { entry in
      NeedsYouView(entry: entry)
        .containerBackground(for: .widget) { Xeno.surface }
        .widgetURL(URL(string: "orca://"))
    }
    .configurationDisplayName("Needs you")
    .description("What your agents and Xeno are waiting on you for.")
    .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

struct NeedsYouView: View {
  @Environment(\.widgetFamily) private var family
  let entry: GlanceEntry

  private var asks: [Glance.Ask] { entry.glance?.asks ?? [] }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Text("\(asks.count)").font(.system(size: 24, weight: .bold, design: .rounded))
          Text("NEED YOU").font(.system(size: 7, weight: .semibold))
        }
      }
      .widgetAccentable()
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Text(asks.isEmpty ? "Nothing waiting" : "\(asks.count) need\(asks.count == 1 ? "s" : "") you")
          .font(.headline)
          .widgetAccentable()
        if let first = asks.first {
          Text("\(first.who): \(first.text)").font(.caption).lineLimit(2)
        } else if let limit = limitLine(entry.glance?.limitResets) {
          Text(limit).font(.caption)
        } else {
          Text(entry.stale ? "Desktop away" : "All quiet").font(.caption)
        }
      }
    case .accessoryInline:
      Text(asks.isEmpty ? "Xeno: nothing waiting" : "Xeno: \(asks.count) need\(asks.count == 1 ? "s" : "") you")
    default:
      small
    }
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("NEEDS YOU")
        .font(.system(size: 11, weight: .medium, design: .monospaced))
        .foregroundStyle(Xeno.amber)
      if entry.unpaired {
        Text("Open Xeno once to connect this widget.")
          .font(.footnote).foregroundStyle(Xeno.secondary)
        Spacer(minLength: 0)
      } else {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text("\(asks.count)").font(.system(size: 48, weight: .bold, design: .rounded)).foregroundStyle(Xeno.text)
          Text(asks.count == 1 ? "thing" : "things").font(.footnote).foregroundStyle(Xeno.secondary)
        }
        Text(asks.first.map { "\($0.who): \($0.text)" } ?? "All quiet.")
          .font(.footnote).foregroundStyle(Xeno.text.opacity(0.85)).lineLimit(3)
        Spacer(minLength: 0)
        Text(footer)
          .font(.system(size: 11, design: .monospaced)).foregroundStyle(Xeno.secondary).lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var footer: String {
    if entry.stale { return "desktop away" }
    if let wait = waited(since: asks.first?.since, now: entry.date) { return "oldest \(wait)" }
    if let resets = entry.glance?.limitResets { return resets.isEmpty ? "Claude limit hit" : "limit until \(resets)" }
    return entry.host ?? "Xeno"
  }
}

// MARK: - Agents

/// Every agent's state and what it's doing, needs-you first. Tap one to open it in Xeno.
struct XenoAgentsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "XenoAgents", provider: GlanceProvider()) { entry in
      AgentsView(entry: entry)
        .containerBackground(for: .widget) { Xeno.surface }
        .widgetURL(URL(string: "orca://"))
    }
    .configurationDisplayName("Agents")
    .description("Your agents at a glance. Tap one to open it in Xeno.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct AgentsView: View {
  @Environment(\.widgetFamily) private var family
  let entry: GlanceEntry

  private var shown: Int {
    switch family {
    case .systemSmall: return 4
    case .systemLarge: return 5
    default: return 2
    }
  }

  private var agents: [Glance.Worktree] {
    Array((entry.glance?.agents ?? []).prefix(shown))
  }

  var body: some View {
    VStack(alignment: .leading, spacing: family == .systemSmall ? 5 : 8) {
      if family == .systemSmall {
        HStack(alignment: .firstTextBaseline) {
          Text("AGENTS")
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .foregroundStyle(Xeno.secondary)
          Spacer(minLength: 4)
          Text(counts).font(.system(size: 11, weight: .semibold, design: .monospaced)).foregroundStyle(Xeno.amber)
        }
      } else {
        HStack {
          Text("Agents").font(.headline).foregroundStyle(Xeno.text)
          Spacer()
          Text(summary).font(.system(size: 11, design: .monospaced)).foregroundStyle(Xeno.secondary)
        }
      }
      if entry.unpaired {
        Text("Open Xeno once to connect this widget.").font(.footnote).foregroundStyle(Xeno.secondary)
      } else if agents.isEmpty {
        Text(entry.stale ? "Desktop away." : "No agents running.").font(.footnote).foregroundStyle(Xeno.secondary)
      }
      ForEach(agents, id: \.self) { agent in
        if family == .systemSmall {
          AgentChip(agent: agent)
        } else {
          AgentRow(agent: agent, roomy: family == .systemLarge)
        }
      }
      Spacer(minLength: 0)
      if family == .systemLarge, let limit = limitLine(entry.glance?.limitResets) {
        Text(limit)
          .font(.system(size: 11, design: .monospaced)).foregroundStyle(Xeno.amber)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var summary: String {
    if entry.stale { return "desktop away" }
    let all = entry.glance?.agents ?? []
    let working = all.filter { $0.state == "working" }.count
    let waiting = all.filter { $0.state == "needs you" }.count
    return "\(working) working · \(waiting) waiting"
  }

  /// The small widget's corner: how many wait on you, or that the desktop is away.
  private var counts: String {
    if entry.stale { return "away" }
    let waiting = (entry.glance?.agents ?? []).filter { $0.state == "needs you" }.count
    return waiting > 0 ? "\(waiting) YOU" : ""
  }
}

/// An agent's tap: opens its worktree in Xeno. Without its id (a desktop that doesn't send it yet)
/// the widget's own tap opens Xeno instead.
struct AgentTap<Content: View>: View {
  let agent: Glance.Worktree
  let content: Content

  init(agent: Glance.Worktree, @ViewBuilder content: () -> Content) {
    self.agent = agent
    self.content = content()
  }

  var body: some View {
    if let id = agent.id, !id.isEmpty {
      Button(intent: XenoOpenAgentIntent(worktree: id)) { content }
        .buttonStyle(.plain)
    } else {
      content
    }
  }
}

/// The small widget's row: the agent's state and name.
struct AgentChip: View {
  let agent: Glance.Worktree

  var body: some View {
    AgentTap(agent: agent) {
      HStack(spacing: 6) {
        Circle().fill(Xeno.stateColor(agent.state)).frame(width: 7, height: 7)
        Text(agent.name).font(.caption.weight(.semibold)).foregroundStyle(Xeno.text).lineLimit(1)
        Spacer(minLength: 0)
      }
      .padding(.vertical, 5)
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        RoundedRectangle(cornerRadius: 9, style: .continuous)
          .fill(Xeno.raised)
          .overlay(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
              .stroke(agent.state == "needs you" ? Xeno.amber.opacity(0.5) : .clear, lineWidth: 1)
          )
      )
    }
  }
}

struct AgentRow: View {
  let agent: Glance.Worktree
  let roomy: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      AgentTap(agent: agent) {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 8) {
            Circle().fill(Xeno.stateColor(agent.state)).frame(width: 8, height: 8)
            Text(agent.name).font(.subheadline.weight(.semibold)).foregroundStyle(Xeno.text).lineLimit(1)
            Spacer(minLength: 4)
            Text(Xeno.stateLabel(agent.state))
              .font(.system(size: 10, weight: .medium, design: .monospaced))
              .foregroundStyle(agent.state == "done" ? Xeno.secondary : Xeno.stateColor(agent.state))
          }
          if let line = agent.line, !line.isEmpty {
            Text(line).font(.caption).foregroundStyle(Xeno.text.opacity(0.8)).lineLimit(roomy ? 2 : 1)
              .padding(.leading, 16)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
      }
      if roomy, let artifact = agent.artifact, let url = URL(string: artifact.url) {
        Link(destination: url) {
          Text("Open “\(artifact.title)” in Claude ›").font(.caption).foregroundStyle(Xeno.teal)
        }
        .padding(.leading, 16)
      }
    }
    .padding(.vertical, roomy ? 8 : 6)
    .padding(.horizontal, 10)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Xeno.raised)
        .overlay(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .stroke(agent.state == "needs you" ? Xeno.amber.opacity(0.5) : .clear, lineWidth: 1)
        )
    )
  }
}

// MARK: - Talk

/// One tap to talk to Xeno, on the home screen, the lock screen or in StandBy.
struct XenoTalkWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "XenoTalk", provider: GlanceProvider()) { entry in
      TalkView(entry: entry)
        .containerBackground(for: .widget) { Xeno.surface }
    }
    .configurationDisplayName("Talk to Xeno")
    .description("Start a call with Xeno, listening. During a call: talk, then send, without opening the app.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
  }
}

struct TalkView: View {
  @Environment(\.widgetFamily) private var family
  let entry: GlanceEntry

  var body: some View {
    if family == .accessoryCircular {
      Button(intent: XenoTalkIntent()) {
        ZStack {
          AccessoryWidgetBackground()
          Image(systemName: "waveform").font(.system(size: 22, weight: .semibold))
        }
      }
      .buttonStyle(.plain)
      .widgetAccentable()
    } else {
      VStack(spacing: 8) {
        HStack {
          Text("XENO").font(.system(size: 11, weight: .medium, design: .monospaced)).foregroundStyle(Xeno.secondary)
          Spacer()
          Text(entry.host ?? "").font(.system(size: 11, design: .monospaced)).foregroundStyle(Xeno.secondary)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
        Button(intent: XenoTalkIntent()) {
          ZStack {
            OrbView(size: 76, glowing: entry.glance?.call == true)
            Image(systemName: "mic.fill").font(.system(size: 24, weight: .semibold)).foregroundStyle(Xeno.navy)
          }
        }
        .buttonStyle(.plain)
        Spacer(minLength: 0)
        Text(entry.glance?.call == true ? "On a call" : "Tap to talk")
          .font(.footnote.weight(.medium))
          .foregroundStyle(entry.glance?.call == true ? Xeno.teal : Xeno.text)
      }
    }
  }
}

/// The same, as a control: Control Center, the lock screen's buttons, the Action button.
struct XenoTalkControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "XenoTalkControl") {
      ControlWidgetButton(action: XenoTalkIntent()) {
        Label("Talk to Xeno", systemImage: "waveform")
      }
    }
    .displayName("Talk to Xeno")
    .description("Start a call with Xeno, listening. During a call: talk, then send, without opening the app.")
  }
}
