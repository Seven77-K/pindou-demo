const fs = require('fs')
const path = require('path')

const uploadsDir = path.join(__dirname, 'uploads')

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

function extFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[mime] || '.jpg'
}

function hasImageValue(image) {
  return Boolean(image && String(image).trim())
}

/** 将 data URL 存为文件，返回 /uploads/xxx 路径；已是 URL 则原样返回 */
function persistDataUrl(image) {
  if (!hasImageValue(image)) return ''
  const trimmed = String(image).trim()
  if (!trimmed.startsWith('data:image/')) return trimmed

  const match = trimmed.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s)
  if (!match) return trimmed

  ensureUploadsDir()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extFromMime(match[1])}`
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(match[2], 'base64'))
  return `/uploads/${filename}`
}

function prepareImageForStorage(image) {
  const stored = persistDataUrl(image || '')
  return {
    image: stored,
    hasImage: hasImageValue(stored) ? 1 : 0,
  }
}

module.exports = {
  uploadsDir,
  ensureUploadsDir,
  hasImageValue,
  persistDataUrl,
  prepareImageForStorage,
}
