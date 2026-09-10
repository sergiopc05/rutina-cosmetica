import { PHOTO_BUCKET, supabase } from '@/lib/supabase'
import { uuid } from '@/lib/util'

/** Reescala una imagen a un lado máximo para no subir fotos enormes. */
export async function downscaleImage(
  file: Blob,
  maxDim = 1400,
  quality = 0.82,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 500_000) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      quality,
    )
  })
}

export async function uploadPhoto(userId: string, file: Blob): Promise<string> {
  const scaled = await downscaleImage(file)
  const path = `${userId}/${uuid()}.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, scaled, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function deletePhoto(path: string | null): Promise<void> {
  if (!path) return
  await supabase.storage.from(PHOTO_BUCKET).remove([path])
}
