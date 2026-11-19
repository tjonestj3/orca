import { useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import { ArrowUp, AudioLines, KeyboardOff, PhoneOff, Plus, Square, X } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import {
  COMPOSER_CONTROL_HIT_SLOP,
  composerInputStyles as box
} from '../components/composer-input/composer-input-styles'
import { colors, pressedStyle, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { JarvisChatImage, JarvisChatOutcome } from './jarvis-chat'
import { chatComposerButton, type ChatComposerButton } from './jarvis-chat-composer'
import { MAX_XENO_IMAGES, pickXenoImages } from './jarvis-images'

type Props = {
  readonly enabled: boolean
  readonly working: boolean
  // 'sent' once the desktop has the message; the box keeps the text and images otherwise.
  readonly onSend: (text: string, images: readonly JarvisChatImage[]) => Promise<JarvisChatOutcome>
  readonly onStop: () => void
  // A Xeno call is open; with nothing typed, the button hangs it up instead of starting one.
  readonly calling: boolean
  readonly onCall: () => void
  readonly onHangUp: () => void
}

// Typing to Xeno, drawn like the Claude app's composer: a rounded card at the bottom of the conversation, with one
// round button that sends, or stops Xeno's reply, and a + to attach photos (a screenshot for an agent, say), which
// Xeno sees and can pass on. Answers come back as text and are never spoken.
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
  // Why the last send didn't go: Xeno unreachable, or Xeno refusing it (with images, most likely one of them).
  const [failed, setFailed] = useState<'unreachable' | 'refused' | 'refusedImage' | null>(null)
  const [typing, setTyping] = useState(false)
  const [images, setImages] = useState<readonly JarvisChatImage[]>([])
  const [attachFailed, setAttachFailed] = useState(false)
  const button = enabled
    ? chatComposerButton({ text, working, sending, calling, images: images.length })
    : 'off'
  const room = MAX_XENO_IMAGES - images.length

  const pick = async (source: 'library' | 'camera'): Promise<void> => {
    setAttachFailed(false)
    try {
      const picked = await pickXenoImages(source, room)
      setImages((now) => [...now, ...picked].slice(0, MAX_XENO_IMAGES))
    } catch {
      setAttachFailed(true)
    }
  }

  const attach = (): void => {
    const library = t('jarvis.chat.photoLibrary', 'Photo Library')
    const camera = t('jarvis.chat.camera', 'Take Photo')
    const cancel = t('common.cancel', 'Cancel')
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [library, camera, cancel], cancelButtonIndex: 2 },
        (index) => {
          if (index === 0 || index === 1) {
            void pick(index === 0 ? 'library' : 'camera')
          }
        }
      )
      return
    }
    Alert.alert(t('jarvis.chat.attach', 'Attach images'), undefined, [
      { text: library, onPress: () => void pick('library') },
      { text: camera, onPress: () => void pick('camera') },
      { text: cancel, style: 'cancel' }
    ])
  }

  const send = async (): Promise<void> => {
    const typed = text.trim()
    const attached = images
    setSending(true)
    setFailed(null)
    const outcome = await onSend(typed, attached)
    setSending(false)
    if (outcome === 'sent') {
      setText((now) => (now.trim() === typed ? '' : now))
      setImages((now) => now.filter((image) => !attached.includes(image)))
      // Xeno has it: the keyboard would cover the answer. A failed send keeps it up to try again.
      Keyboard.dismiss()
    } else if (outcome === 'refused') {
      setFailed(attached.length > 0 ? 'refusedImage' : 'refused')
    } else {
      setFailed('unreachable')
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
          {failed === 'refusedImage'
            ? t(
                'jarvis.chat.refusedImage',
                "Xeno couldn't take that image. Remove it and try again."
              )
            : failed === 'refused'
              ? t('jarvis.chat.refused', "Xeno couldn't take that message. It's still here.")
              : t('jarvis.chat.unreachable', "Couldn't reach Xeno. Your message is still here.")}
        </Text>
      ) : null}
      {attachFailed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {t('jarvis.chat.attachFailed', "Couldn't attach that image.")}
        </Text>
      ) : null}
      <View style={[box.box, styles.card]}>
        {images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
            keyboardShouldPersistTaps="handled"
          >
            {images.map((image, index) => (
              <View key={`${index}:${image.uri ?? image.base64.slice(0, 32)}`}>
                <Image
                  source={{ uri: image.uri ?? `data:image/jpeg;base64,${image.base64}` }}
                  style={styles.thumb}
                  accessibilityIgnoresInvertColors
                />
                <Pressable
                  onPress={() => {
                    setImages((now) => now.filter((other) => other !== image))
                    setFailed(null)
                  }}
                  hitSlop={COMPOSER_CONTROL_HIT_SLOP}
                  style={({ pressed }) => [styles.remove, pressed && pressedStyle]}
                  accessibilityRole="button"
                  accessibilityLabel={t('jarvis.chat.removeImage', 'Remove image')}
                >
                  <X size={12} color={colors.textPrimary} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <TextInput
          style={[box.messageText, styles.input]}
          value={text}
          onChangeText={(next) => {
            setText(next)
            setFailed(null)
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
          <Pressable
            onPress={attach}
            disabled={!enabled || room <= 0}
            hitSlop={COMPOSER_CONTROL_HIT_SLOP}
            style={({ pressed }) => [
              styles.attach,
              (!enabled || room <= 0) && styles.attachOff,
              pressed && pressedStyle
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled || room <= 0 }}
            accessibilityLabel={t('jarvis.chat.attach', 'Attach images')}
          >
            <Plus size={20} color={colors.textSecondary} strokeWidth={2.2} />
          </Pressable>
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
  attach: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  attachOff: { opacity: 0.4 },
  thumbs: { gap: spacing.sm, paddingBottom: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radii.control, backgroundColor: colors.bgRaised },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase,
    opacity: 0.9
  },
  input: { fontSize: 17, lineHeight: 24, maxHeight: 7 * 24 }
}))
