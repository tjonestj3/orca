export type ChatComposerButton = 'send' | 'stop' | 'call' | 'hangUp' | 'off'

// What the chat's one round button does, as in the Claude app. Typed text always sends, even while Xeno answers
// (it's answered next); with nothing typed while Xeno is answering, it stops the reply; with nothing typed
// otherwise, it calls Xeno, or hangs up the call that's open. Attached images send like text. While a send is on
// its way it does nothing.
export function chatComposerButton(at: {
  readonly text: string
  readonly working: boolean
  readonly sending: boolean
  readonly calling: boolean
  readonly images?: number
}): ChatComposerButton {
  if (at.sending) {
    return 'off'
  }
  if (at.text.trim() || (at.images ?? 0) > 0) {
    return 'send'
  }
  if (at.working) {
    return 'stop'
  }
  return at.calling ? 'hangUp' : 'call'
}
