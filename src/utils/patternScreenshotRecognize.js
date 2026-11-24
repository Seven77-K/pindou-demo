import dayjs from 'dayjs'
import { createWorker } from 'tesseract.js'
import {
  collectAuthorPaidAmountRefs,
  getMemberValueAmountByAuthorPaid,
} from '@/utils/patternSize'

const NOISE_WORDS = [
  '会员专享',
  '付费',
  '免费',
  '天前',
  '小时前',
  '分钟前',
  '刚刚',
  '昨天',
  '前天',
  '浏览',
  '点赞',
  '色号',
]

function normalizeOcrText(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[｜|/]/g, ' ')
    .replace(/[×xXＸ＊]/g, '*')
    .replace(/[·•．]/g, '·')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

function splitLines(text = '') {
  return normalizeOcrText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function scoreAuthorCandidate(candidate, existingAuthors = []) {
  const name = String(candidate || '').trim()
  if (!name) return { name: '', score: -1 }

  // 优先更长正式名：奶糖 → 穗穗奶糖；小野 → 小野茉纱
  const longer = existingAuthors
    .filter(
      (item) =>
        item !== name
        && item.length > name.length
        && (item.startsWith(name) || item.endsWith(name)),
    )
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh-CN'))
  if (longer[0]) return { name: longer[0], score: 92 }

  const exact = existingAuthors.find((item) => item === name)
  if (exact) return { name: exact, score: 100 }

  const contains = existingAuthors
    .filter((item) => item.includes(name) || name.includes(item))
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh-CN'))
  if (contains[0]) return { name: contains[0], score: 80 }

  return { name, score: 40 }
}

function pickBestAuthor(lines = [], existingAuthors = []) {
  const authors = [...new Set((existingAuthors || []).map((item) => String(item || '').trim()).filter(Boolean))]
  let best = { name: '', score: -1 }

  lines.forEach((line) => {
    if (/会员专享/.test(line)) {
      const before = line
        .replace(/会员专享.*$/, '')
        .replace(/@/g, '')
        .replace(/[^\u4e00-\u9fa5A-Za-z0-9·_\-]/g, ' ')
        .trim()
      const hit = scoreAuthorCandidate(before.split(/\s+/).pop(), authors)
      if (hit.score > best.score) best = hit
    }
  })

  if (best.score >= 80) return best.name

  for (const author of authors) {
    if (lines.some((line) => line.includes(author))) {
      return author
    }
  }

  for (const line of [...lines].reverse()) {
    if (NOISE_WORDS.some((word) => line.includes(word))) continue
    if (/^\d+([*\s]+\d+)?$/.test(line)) continue
    if (line.length < 2 || line.length > 16) continue
    if (!/[\u4e00-\u9fa5]/.test(line)) continue
    const cleaned = line.replace(/@/g, '').trim()
    const hit = scoreAuthorCandidate(cleaned, authors)
    if (hit.score > best.score) best = hit
  }

  return best.name
}

function pickTitle(lines = [], author = '') {
  const skip = new Set(
    [
      author,
      ...NOISE_WORDS,
    ].filter(Boolean),
  )

  for (const line of lines) {
    if (skip.has(line)) continue
    if (/会员专享|付费专享/.test(line)) continue
    if (/^\d+(\s+\d+){1,3}$/.test(line)) continue
    if (/\d+\s*\*\s*\d+/.test(line) && line.replace(/\d|\s|\*/g, '').length < 2) continue
    if (/天前|小时前|分钟前|刚刚|昨天|前天/.test(line)) continue
    if (line.length < 2 || line.length > 40) continue
    // 标题常含中英文/间隔号
    if (/[\u4e00-\u9fa5A-Za-z0-9]/.test(line)) {
      return line.replace(/^@/, '').trim()
    }
  }
  return ''
}

function pickSize(text = '') {
  const match = String(text).match(/(\d{2,3})\s*\*\s*(\d{2,3})/)
  if (!match) return ''
  return `${Number(match[1])}*${Number(match[2])}`
}

/** 付费图纸截图上通常带 ¥ / 元；避开色数、浏览量这类纯整数 */
function pickPrice(text = '') {
  const source = String(text || '')
  const marked =
    source.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/) ||
    source.match(/(\d+(?:\.\d{1,2})?)\s*元/) ||
    source.match(/(?:价格|金额|售价)\s*[:：]?\s*(\d+(?:\.\d{1,2})?)/)
  if (!marked) return null
  const amount = Number(marked[1])
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1000) return null
  return Math.round(amount * 100) / 100
}

/**
 * 会员图纸页下仍有三种类型：
 * - 付费：图上一般有金额
 * - 会员：会员专享等，金额走系统定价
 * - 免费：免费标识，无金额
 */
function pickType(text = '', price = null) {
  const source = String(text || '')
  if (/付费/.test(source) || price != null) return 'paid'
  if (/免费/.test(source) && !/会员专享/.test(source)) return 'free'
  if (/会员专享|会员/.test(source)) return 'member'
  if (/免费/.test(source)) return 'free'
  return 'member'
}

function pickDate(text = '', baseDate = new Date()) {
  const base = dayjs(baseDate)
  if (!base.isValid()) return dayjs().format('YYYY-MM-DD')

  if (/刚刚|分钟前|小时前|今日|今天/.test(text)) {
    return base.format('YYYY-MM-DD')
  }
  if (/昨天/.test(text)) {
    return base.subtract(1, 'day').format('YYYY-MM-DD')
  }
  if (/前天/.test(text)) {
    return base.subtract(2, 'day').format('YYYY-MM-DD')
  }

  const days = text.match(/(\d+)\s*天前/)
  if (days) {
    return base.subtract(Number(days[1]), 'day').format('YYYY-MM-DD')
  }

  const absolute = text.match(/(20\d{2})[./年-](\d{1,2})[./月-](\d{1,2})/)
  if (absolute) {
    const date = dayjs(
      `${absolute[1]}-${String(absolute[2]).padStart(2, '0')}-${String(absolute[3]).padStart(2, '0')}`,
    )
    if (date.isValid()) return date.format('YYYY-MM-DD')
  }

  return base.format('YYYY-MM-DD')
}

function loadImageElement(fileOrBlob) {
  const url = URL.createObjectURL(fileOrBlob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

async function canvasToJpegBlob(canvas, fallback) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92)
  })
  return blob || fallback
}

async function cropBottomRegion(file, ratio = 0.45) {
  const { img, url } = await loadImageElement(file)
  try {
    const cutRatio = Math.min(0.7, Math.max(0.28, Number(ratio) || 0.45))
    const height = Math.max(1, Math.round(img.height * cutRatio))
    const y = Math.max(0, img.height - height)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, y, img.width, height, 0, 0, img.width, height)
    return canvasToJpegBlob(canvas, file)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function findGapCenters(signal = [], minGap = 8) {
  if (!signal.length) return []
  const sorted = [...signal].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] || 0
  const threshold = median * 0.55
  const gaps = []
  let start = -1
  for (let i = 0; i < signal.length; i += 1) {
    if (signal[i] <= threshold) {
      if (start < 0) start = i
    } else if (start >= 0) {
      const width = i - start
      if (width >= minGap) gaps.push(Math.round((start + i - 1) / 2))
      start = -1
    }
  }
  if (start >= 0 && signal.length - start >= minGap) {
    gaps.push(Math.round((start + signal.length - 1) / 2))
  }
  return gaps
}

function buildSegments(length, cuts = [], minSize = 80) {
  const points = [0, ...cuts.filter((x) => x > 12 && x < length - 12), length]
    .sort((a, b) => a - b)
    .filter((value, index, arr) => index === 0 || value !== arr[index - 1])
  const segments = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    if (end - start >= minSize) segments.push([start, end])
  }
  return segments.length ? segments : [[0, length]]
}

/**
 * 把一张多卡拼图拆成单卡：优先横切（左右并排），必要时再竖切（上下）
 */
export async function splitScreenshotCards(file) {
  const { img, url } = await loadImageElement(file)
  try {
    const canvas = document.createElement('canvas')
    const maxW = 1200
    const scale = Math.min(1, maxW / img.width)
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const colSignal = new Array(width).fill(0)
    const rowSignal = new Array(height).fill(0)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        // 内容越“花”越大；浅色缝隙更接近 0
        const vivid = Math.max(r, g, b) - Math.min(r, g, b)
        const darkness = 255 - (r + g + b) / 3
        const score = vivid * 0.65 + darkness * 0.35
        colSignal[x] += score
        rowSignal[y] += score
      }
    }

    const aspect = img.width / Math.max(1, img.height)
    let xSegments = [[0, img.width]]
    let ySegments = [[0, img.height]]

    if (aspect >= 1.25 || img.width >= 900) {
      const cuts = findGapCenters(colSignal, Math.max(6, Math.round(width * 0.012)))
        .map((x) => Math.round(x / scale))
      xSegments = buildSegments(img.width, cuts, Math.max(120, Math.round(img.width * 0.12)))
    }

    // 很明显的上下多行时再切
    if (aspect <= 1.05 && img.height >= 900) {
      const cuts = findGapCenters(rowSignal, Math.max(6, Math.round(height * 0.012)))
        .map((y) => Math.round(y / scale))
      ySegments = buildSegments(img.height, cuts, Math.max(140, Math.round(img.height * 0.18)))
    }

    // 左右切出的单卡仍偏扁时，再尝试按等分兜底（常见 3/4/5 卡横排）
    if (xSegments.length === 1 && aspect >= 1.8) {
      const guess = Math.max(2, Math.min(6, Math.round(aspect / 0.72)))
      const slice = Math.round(img.width / guess)
      xSegments = Array.from({ length: guess }, (_, index) => [
        index * slice,
        index === guess - 1 ? img.width : (index + 1) * slice,
      ])
    }

    const cards = []
    for (const [y0, y1] of ySegments) {
      for (const [x0, x1] of xSegments) {
        const w = x1 - x0
        const h = y1 - y0
        if (w < 80 || h < 80) continue
        const cardCanvas = document.createElement('canvas')
        cardCanvas.width = w
        cardCanvas.height = h
        const cardCtx = cardCanvas.getContext('2d')
        cardCtx.drawImage(img, x0, y0, w, h, 0, 0, w, h)
        const blob = await canvasToJpegBlob(cardCanvas, null)
        if (!blob) continue
        const cardFile = new File(
          [blob],
          `${String(file.name || 'card').replace(/\.[^.]+$/, '')}_${cards.length + 1}.jpg`,
          { type: 'image/jpeg' },
        )
        cards.push(cardFile)
      }
    }

    return cards.length ? cards : [file]
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function parseScreenshotOcrText(
  text = '',
  { existingAuthors = [], baseDate = new Date() } = {},
) {
  const normalized = normalizeOcrText(text)
  const lines = splitLines(normalized)
  const size = pickSize(normalized)
  const ocrAmount = pickPrice(normalized)
  const type = pickType(normalized, ocrAmount)
  const author = pickBestAuthor(lines, existingAuthors)
  const name = pickTitle(
    lines.filter((line) => line !== author && !line.includes(author)),
    author,
  )
  const date = pickDate(normalized, baseDate)

  const errors = []
  if (!name) errors.push('未识别到图纸名称')
  else if (name.length < 2 || !/[\u4e00-\u9fa5A-Za-z]/.test(name) || /^[\d\s<>=|_.;:：-]+$/.test(name)) {
    errors.push('图纸名称识别异常，请手动修改')
  }
  if (!author) errors.push('未识别到作者')
  else if (author.length < 2 || !/[\u4e00-\u9fa5A-Za-z]/.test(author) || /[=<>|_]/.test(author)) {
    errors.push('作者识别异常，请手动修改')
  }
  if (!size) errors.push('未识别到规格')

  return {
    name,
    author,
    size,
    type,
    date,
    ocrAmount,
    rawText: normalized,
    errors,
    valid: errors.length === 0,
  }
}

export function suggestRecognizeValueAmount({
  type,
  size,
  author,
  memberPatterns = [],
  category = 'member',
  ocrAmount = null,
} = {}) {
  if (category !== 'member') return null
  if (type === 'free') return null
  if (type === 'paid') {
    const fromOcr = Number(ocrAmount)
    return Number.isFinite(fromOcr) && fromOcr > 0
      ? Math.round(fromOcr * 100) / 100
      : null
  }
  if (type !== 'member') return null
  const paidRefs = collectAuthorPaidAmountRefs(memberPatterns, author)
  return getMemberValueAmountByAuthorPaid(size, paidRefs)
}

let sharedWorker = null
let sharedWorkerLang = ''

async function getWorker(lang = 'chi_sim+eng') {
  if (sharedWorker && sharedWorkerLang === lang) return sharedWorker
  if (sharedWorker) {
    await sharedWorker.terminate()
    sharedWorker = null
  }
  sharedWorker = await createWorker(lang)
  sharedWorkerLang = lang
  return sharedWorker
}

export async function terminateRecognizeWorker() {
  if (!sharedWorker) return
  await sharedWorker.terminate()
  sharedWorker = null
  sharedWorkerLang = ''
}

async function recognizeSingleCard(
  file,
  {
    existingAuthors = [],
    baseDate = new Date(),
    memberPatterns = [],
    category = 'member',
    buyer = '',
  } = {},
) {
  const cropped = await cropBottomRegion(file, 0.46)
  const worker = await getWorker('chi_sim+eng')
  const result = await worker.recognize(cropped)
  const parsed = parseScreenshotOcrText(result?.data?.text || '', {
    existingAuthors,
    baseDate,
  })
  const valueAmount = suggestRecognizeValueAmount({
    type: parsed.type,
    size: parsed.size,
    author: parsed.author,
    memberPatterns,
    category,
    ocrAmount: parsed.ocrAmount,
  })

  return {
    ...parsed,
    buyer: String(buyer || '').trim(),
    valueAmount,
    previewUrl: URL.createObjectURL(file),
    file,
  }
}

export async function recognizePatternScreenshot(file, options = {}) {
  const cards = await splitScreenshotCards(file)
  const rows = []
  for (const card of cards) {
    rows.push(await recognizeSingleCard(card, options))
  }
  return rows
}
