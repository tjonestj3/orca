// What the chat's one button does. Typed text always sends, even while Xeno answers (it's answered next); with
// nothing typed while Xeno is answering, it stops the reply; while a send is on its way it does nothing.
export function chatComposerButton(at: {
  readonly text: string
  readonly working: boolean
  readonly sending: boolean
}): 'send' | 'stop' | 'off' {
  if (at.sending) {
    return 'off'
  }
  if (at.text.trim()) {
    return 'send'
  }
  return at.working ? 'stop' : 'off'
}
