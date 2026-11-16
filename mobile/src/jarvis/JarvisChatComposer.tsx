import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ArrowUp, Square } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import {
  COMPOSER_CONTROL_HIT_SLOP,
  composerInputStyles as box
} from '../components/composer-input/composer-input-styles'
import { colors, pressedStyle, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { chatComposerButton } from './jarvis-chat-composer'

type Props = {
  readonly enabled: boolean
  readonly working: boolean
  // True once the desktop has the message; the box keeps the text otherwise.
  readonly onSend: (text: string) => Promise<boolean>
  readonly onStop: () => void
}

// Typing to Xeno, drawn like the Claude app's composer: a rounded card at the bottom of the conversation, with one
// round button that sends, or stops Xeno's reply.
// Answers come back as text and are never spoken.
export function JarvisChatComposer({ enabled, working, onSend, onStop }: Props) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const button = enabled ? chatComposerButton({ text, working, sending }) : 'off'

  const send = async (): Promise<void> => {
    const typed = text.trim()
    setSending(true)
    setFailed(false)
    const sent = await onSend(typed)
    setSending(false)
    if (sent) {
      setText((now) => (now.trim() === typed ? '' : now))
    } else {
      setFailed(true)
    }
  }

  const press = (): void => {
    if (button === 'send') {
      void send()
    } else if (button === 'stop') {
      onStop()
    }
  }

  const live = button !== 'off'
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
          multiline
          accessibilityLabel={t('jarvis.chat.placeholder', 'Message Xeno')}
        />
        <View style={box.actionRow}>
          <View style={box.actionSpacer} />
          <Pressable
            onPress={press}
            disabled={!live}
            hitSlop={COMPOSER_CONTROL_HIT_SLOP}
            style={({ pressed }) => [
              box.sendButton,
              !live && box.sendButtonDisabled,
              pressed && live && pressedStyle
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !live }}
            accessibilityLabel={
              button === 'stop' ? t('jarvis.chat.stop', 'Stop Xeno') : t('jarvis.chat.send', 'Send')
            }
          >
            {button === 'stop' ? (
              <Square size={13} color={colors.bgBase} fill={colors.bgBase} />
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
  input: { fontSize: 17, lineHeight: 24, maxHeight: 7 * 24 }
}))
