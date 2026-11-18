import { useState } from 'react'
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import { ArrowUp, AudioLines, KeyboardOff, PhoneOff, Square } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import {
  COMPOSER_CONTROL_HIT_SLOP,
  composerInputStyles as box
} from '../components/composer-input/composer-input-styles'
import { colors, pressedStyle, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { chatComposerButton, type ChatComposerButton } from './jarvis-chat-composer'

type Props = {
  readonly enabled: boolean
  readonly working: boolean
  // True once the desktop has the message; the box keeps the text otherwise.
  readonly onSend: (text: string) => Promise<boolean>
  readonly onStop: () => void
  // A Xeno call is open; with nothing typed, the button hangs it up instead of starting one.
  readonly calling: boolean
  readonly onCall: () => void
  readonly onHangUp: () => void
}

// Typing to Xeno, drawn like the Claude app's composer: a rounded card at the bottom of the conversation, with one
// round button that sends, or stops Xeno's reply.
// Answers come back as text and are never spoken.
export function JarvisChatComposer({
  enabled,
  working,
  onSend,
  onStop,
  calling,
  onCall,
  onHangUp
}: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [typing, setTyping] = useState(false)
  const button = enabled ? chatComposerButton({ text, working, sending, calling }) : 'off'

  const send = async (): Promise<void> => {
    const typed = text.trim()
    setSending(true)
    setFailed(false)
    const sent = await onSend(typed)
    setSending(false)
    if (sent) {
      setText((now) => (now.trim() === typed ? '' : now))
      // Xeno has it: the keyboard would cover the answer. A failed send keeps it up to try again.
      Keyboard.dismiss()
    } else {
      setFailed(true)
    }
  }

  const press = (): void => {
    if (button === 'send') {
      void send()
    } else if (button === 'stop') {
      onStop()
    } else if (button === 'call') {
      onCall()
    } else if (button === 'hangUp') {
      onHangUp()
    }
  }

  const live = button !== 'off'
  const label = (which: ChatComposerButton): string =>
    which === 'stop'
      ? t('jarvis.chat.stop', 'Stop Xeno')
      : which === 'call'
        ? t('jarvis.chat.call', 'Talk to Xeno')
        : which === 'hangUp'
          ? t('jarvis.bubble.hangUp', 'Hang up Xeno')
          : t('jarvis.chat.send', 'Send')
  return (
    <View style={styles.dock}>
      {failed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {t('jarvis.chat.unreachable', "Couldn't reach Xeno. Your message is still here.")}
        </Text>
      ) : null}
      <View style={[box.box, styles.card]}>
        <TextInput
          style={[box.messageText, styles.input]}
          value={text}
          onChangeText={(next) => {
            setText(next)
            setFailed(false)
          }}
          placeholder={t('jarvis.chat.placeholder', 'Message Xeno')}
          placeholderTextColor={colors.textMuted}
          editable={enabled}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          multiline
          accessibilityLabel={t('jarvis.chat.placeholder', 'Message Xeno')}
        />
        <View style={box.actionRow}>
          {typing ? (
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={COMPOSER_CONTROL_HIT_SLOP}
              style={({ pressed }) => [styles.hideKeyboard, pressed && pressedStyle]}
              accessibilityRole="button"
              accessibilityLabel={t('jarvis.chat.hideKeyboard', 'Hide keyboard')}
            >
              <KeyboardOff size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
          <View style={box.actionSpacer} />
          <Pressable
            onPress={press}
            disabled={!live}
            hitSlop={COMPOSER_CONTROL_HIT_SLOP}
            style={({ pressed }) => [
              box.sendButton,
              !live && box.sendButtonDisabled,
              button === 'hangUp' && styles.hangUp,
              pressed && live && pressedStyle
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !live }}
            accessibilityLabel={label(button)}
          >
            {button === 'stop' ? (
              <Square size={13} color={colors.bgBase} fill={colors.bgBase} />
            ) : button === 'call' ? (
              <AudioLines size={19} color={colors.bgBase} strokeWidth={2.2} />
            ) : button === 'hangUp' ? (
              <PhoneOff size={17} color={colors.onAccent} strokeWidth={2.2} />
            ) : (
              <ArrowUp
                size={19}
                color={live ? colors.bgBase : colors.textMuted}
                strokeWidth={2.4}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  dock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bgBase,
    gap: spacing.xs
  },
  error: { color: colors.statusRed, fontSize: typography.metaSize, paddingHorizontal: spacing.sm },
  // The Claude app's composer: a rounded card, the text on top and its button below.
  card: { paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  hangUp: { backgroundColor: colors.statusRed },
  hideKeyboard: { padding: spacing.xs },
  input: { fontSize: 17, lineHeight: 24, maxHeight: 7 * 24 }
}))
