import type { JarvisWorktree } from './jarvis-worktrees'

// What a tap on the Jarvis screen asks Jarvis. Sent to the model as the person's request, not shown, so not localized.
type Target = Pick<JarvisWorktree, 'name' | 'repo'>

const where = (wt: Target): string =>
  wt.repo ? `the ${wt.name} worktree in ${wt.repo}` : `the ${wt.name} worktree`

export function askForUpdate(wt: Target): string {
  return `Give me the latest on ${where(wt)}.`
}

export function askToTalkAbout(wt: Target): string {
  return `Let's talk about ${where(wt)}. Give me a quick status, then I'll tell you what I need.`
}

export function askToSendMessage(wt: Target): string {
  return `I want to send a message to the agent in ${where(wt)}. Ask me what to say, then send it.`
}
