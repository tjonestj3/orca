import * as ImagePicker from 'expo-image-picker'
import {
  defaultMobileImageFileFactory,
  pickMobileImages,
  readUriAsBase64
} from '../files/attachments/mobile-image-source-picker'
import type { JarvisChatImage } from './jarvis-chat'

// Images typed to Xeno: from the photo library (several at once) or the camera. Library picks come back as JPEG,
// which Claude reads (iOS would otherwise hand back HEIC). Xeno shrinks them on the desktop.
export const MAX_XENO_IMAGES = 4

// A camera photo at full quality is several MB more than it needs to be for Claude to read it.
const CAMERA_QUALITY = 0.8

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission denied')
    this.name = 'CameraPermissionError'
  }
}

// Up to `room` images; none when the person cancels. Throws when access is refused or an image can't be read.
export async function pickXenoImages(
  source: 'library' | 'camera',
  room: number
): Promise<JarvisChatImage[]> {
  if (room <= 0) {
    return []
  }
  if (source === 'library') {
    const picked: JarvisChatImage[] = []
    // Each photo is read as it's handed over: stop once there's no more room, so 20 chosen don't mean 20 read
    // (and one too big past the limit can't sink the ones kept).
    for await (const image of pickMobileImages('library')) {
      picked.push({ base64: image.base64, uri: image.uri })
      if (picked.length >= room) {
        break
      }
    }
    return picked
  }
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new CameraPermissionError()
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: CAMERA_QUALITY,
    base64: false
  })
  const asset = result.canceled ? null : result.assets[0]
  if (!asset?.uri) {
    return []
  }
  const base64 = await readUriAsBase64(asset.uri, asset.fileSize, defaultMobileImageFileFactory)
  return [{ base64, uri: asset.uri }]
}
