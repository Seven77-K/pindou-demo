const MAX_SIDE = 2000
const AVATAR_MAX_SIDE = 256
const MAX_DATA_URL_LENGTH = 1.8 * 1024 * 1024
const AVATAR_MAX_DATA_URL_LENGTH = 120 * 1024
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

/** 压缩后转为 data URL 存入数据库，保持完整画面不裁剪 */
export async function compressImageForStorage(file) {
  const img = await loadImageFromFile(file)

  let width = img.naturalWidth
  let height = img.naturalHeight
  const scale = Math.min(1, MAX_SIDE / width, MAX_SIDE / height)
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  const usePng = file.type === 'image/png'
  let quality = 0.88
  let result = canvas.toDataURL(usePng ? 'image/png' : 'image/jpeg', quality)

  if (!usePng) {
    while (result.length > MAX_DATA_URL_LENGTH && quality > 0.45) {
      quality -= 0.08
      result = canvas.toDataURL('image/jpeg', quality)
    }
  }

  return result
}

async function compressToDataUrl(file, maxSide, maxLength, forceJpeg = false) {
  const img = await loadImageFromFile(file)

  let width = img.naturalWidth
  let height = img.naturalHeight
  const scale = Math.min(1, maxSide / width, maxSide / height)
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  const usePng = !forceJpeg && file.type === 'image/png'
  let quality = 0.88
  let result = canvas.toDataURL(usePng ? 'image/png' : 'image/jpeg', quality)

  if (!usePng) {
    while (result.length > maxLength && quality > 0.45) {
      quality -= 0.08
      result = canvas.toDataURL('image/jpeg', quality)
    }
  }

  return result
}

/** 头像专用压缩，体积更小便于 localStorage 存储 */
export async function compressAvatarForStorage(file) {
  return compressToDataUrl(file, AVATAR_MAX_SIDE, AVATAR_MAX_DATA_URL_LENGTH, true)
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片压缩失败'))
    }, type, quality)
  })
}

/** 上传前压缩：超过 maxBytes 时缩尺寸并转 JPEG，直至满足大小限制 */
export async function compressImageForUpload(file, maxBytes = UPLOAD_MAX_BYTES) {
  if (file.size <= maxBytes) return file

  const img = await loadImageFromFile(file)
  const { naturalWidth: width, naturalHeight: height } = img
  let maxSide = MAX_SIDE
  let blob = null

  while (maxSide >= 800) {
    const scale = Math.min(1, maxSide / width, maxSide / height)
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)

    let quality = 0.88
    while (quality >= 0.45) {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      if (blob.size <= maxBytes) {
        const name = file.name.replace(/\.[^.]+$/i, '') + '.jpg'
        return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
      }
      quality -= 0.08
    }
    maxSide = Math.round(maxSide * 0.75)
  }

  if (!blob) throw new Error('图片压缩失败')

  const name = file.name.replace(/\.[^.]+$/i, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}
