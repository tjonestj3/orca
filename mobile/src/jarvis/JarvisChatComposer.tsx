import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { ArrowUp, Square } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
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

// Typing to Xeno: a box at the bottom of the conversation, with one button that sends, or stops Xeno's reply.
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

  return (
    <View style={styles.dock}>
      {failed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {t('jarvis.chat.unreachable', "Couldn't reach Xeno. Your message is still here.")}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
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
        <Pressable
          onPress={press}
          disabled={button === 'off'}
          style={({ pressed }) => [
            styles.button,
            button === 'off' && styles.buttonOff,
            pressed && pressedStyle
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            button === 'stop' ? t('jarvis.chat.stop', 'Stop Xeno') : t('jarvis.chat.send', 'Send')
          }
        >
          {button === 'stop' ? (
            <Square size={14} color={colors.onAccent} fill={colors.onAccent} />
          ) : (
            <ArrowUp size={18} color={colors.onAccent} />
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  dock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bgBase,
    gap: spacing.xs
  },
  error: { color: colors.statusRed, fontSize: typography.metaSize, paddingHorizontal: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.chatUserBorder,
    backgroundColor: colors.chatUserSurface,
    color: colors.textPrimary,
    fontSize: typography.bodySize
  },
  button: {
    width: 36,
    height: 36,
    marginBottom: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentBlue
  },
  buttonOff: { opacity: 0.35 }
}))
