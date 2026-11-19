// Shrinks a receipt photo on the device before upload: long edge ≤ 1600 px, JPEG.
export const RECEIPT_MAX_EDGE = 1600
export const MAX_RECEIPT_PHOTOS = 3

export interface ReceiptImage {
  data: string
  media_type: 'image/jpeg'
}

export async function prepareReceiptImage(file: File): Promise<ReceiptImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, RECEIPT_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not read that photo.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), media_type: 'image/jpeg' }
}
