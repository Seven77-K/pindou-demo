import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {
  collectAuthorPaidAmountRefs,
  getMemberValueAmountByAuthorPaid,
} from '@/utils/patternSize'

dayjs.extend(customParseFormat)

const MEMBER_TEMPLATE_HEADERS = [
  '图纸名称',
  '图纸作者',
  '规格',
  '图纸类别',
  '图纸类型',
  '购买人',
  '金额',
  '是否完成',
  '图纸日期',
]

const NORMAL_TEMPLATE_HEADERS = [
  '图纸名称',
  '图纸作者',
  '规格',
  '图纸类别',
  '图纸类型',
  '购买人',
  '价格',
  '是否完成',
  '图纸日期',
]

const COLUMN_ALIASES = {
  name: ['图纸名称', '名称', 'name'],
  author: ['图纸作者', '作者', 'author'],
  size: ['规格', 'size'],
  patternCategory: ['图纸类别', '类别', 'patterncategory', 'pattern_category'],
  type: ['图纸类型', '类型', 'type'],
  buyer: ['购买人', 'buyer'],
  price: ['价格', 'price'],
  valueAmount: ['金额', 'valueamount', 'value_amount'],
  completed: ['是否完成', '完成', 'completed'],
  date: ['图纸日期', '日期', 'date'],
}

const TYPE_MAP = {
  免费: 'free',
  free: 'free',
  付费: 'paid',
  paid: 'paid',
  会员: 'member',
  member: 'member',
}

const COMPLETED_TRUE = new Set(['是', '已完成', '完成', 'true', '1', 'y', 'yes'])
const COMPLETED_FALSE = new Set(['否', '未完成', 'false', '0', 'n', 'no'])

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function findColumnKey(header) {
  const normalized = normalizeHeader(header)
  if (!normalized) return null

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return key
    }
  }
  return null
}

function cellText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
    }
  }

  const text = cellText(value)
  if (!text) return ''

  const formats = ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYY年M月D日']
  for (const format of formats) {
    const parsed = dayjs(text, format, true)
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
  }

  const loose = dayjs(text)
  if (loose.isValid()) return loose.format('YYYY-MM-DD')

  return text
}

function parseType(value, category = 'member') {
  const text = cellText(value).toLowerCase()
  if (!text) return { type: '', error: '图纸类型不能为空' }

  const mapped = TYPE_MAP[text] || TYPE_MAP[cellText(value)]
  if (!mapped) {
    return { type: '', error: `图纸类型需为：${allowedTypeHint(category)}` }
  }
  return { type: mapped, error: '' }
}

function parseCompleted(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false

  const text = cellText(value).toLowerCase()
  if (!text) return false
  if (COMPLETED_TRUE.has(text)) return true
  if (COMPLETED_FALSE.has(text)) return false
  return null
}

function validateRow(row, rowNumber, category = 'member') {
  const errors = []
  const markDelete = row.markDelete === true

  if (!row.name) errors.push('图纸名称不能为空')

  if (markDelete) {
    if (!row.author) errors.push('图纸作者不能为空')
    return {
      ...row,
      rowNumber,
      errors,
      valid: errors.length === 0,
      markDelete: true,
    }
  }

  if (!row.author) errors.push('图纸作者不能为空')
  if (!row.size) errors.push('规格不能为空')
  if (!row.type) {
    errors.push(row.typeError || '图纸类型不能为空')
  } else if (category === 'normal' && row.type === 'member') {
    errors.push('普通图纸不支持「会员」类型，请改为免费或付费')
  }
  if (row.completed === null) errors.push('是否完成需为：是 / 否（或 已完成 / 未完成）')
  if (row.priceError) errors.push(row.priceError)
  if (row.valueAmountError) errors.push(row.valueAmountError)

  if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    errors.push('图纸日期格式不正确，请使用 YYYY-MM-DD')
  }

  return {
    ...row,
    rowNumber,
    errors,
    valid: errors.length === 0,
  }
}

function allowedTypeHint(category) {
  return category === 'member' ? '免费 / 付费 / 会员' : '免费 / 付费'
}

function getTemplateHeaders(category = 'member') {
  return category === 'normal' ? NORMAL_TEMPLATE_HEADERS : MEMBER_TEMPLATE_HEADERS
}

function parseAmount(value) {
  const text = cellText(value)
  if (!text) return { amount: null, error: '' }
  const num = Number(text)
  if (!Number.isFinite(num) || num < 0) {
    return { amount: null, error: '金额需为非负数字' }
  }
  return { amount: Math.round(num * 100) / 100, error: '' }
}

function parsePrice(value) {
  const { amount, error } = parseAmount(value)
  return { price: amount, error: error ? error.replace('金额', '价格') : '' }
}

export function resolveImportValueAmount(row, memberPatterns = []) {
  if (row.valueAmount != null) return row.valueAmount
  if (row.type === 'free') return null
  if (row.type === 'member') {
    const paidRefs = collectAuthorPaidAmountRefs(memberPatterns, row.author)
    return getMemberValueAmountByAuthorPaid(row.size, paidRefs)
  }
  if (row.type === 'paid') return 3
  return null
}

export function formatImportValueAmount(row, memberPatterns = []) {
  const amount = resolveImportValueAmount(row, memberPatterns)
  if (amount == null) return '—'
  return `¥${Number(amount).toFixed(2)}`
}

export function downloadPatternImportTemplate(category = 'member') {
  const headers = getTemplateHeaders(category)
  const example =
    category === 'member'
      ? [
          ['限定樱花', '小七', '104', '花卉', '会员', '晴儿', '', '是', '2026-06-20'],
          ['可爱小猫', '阿豆', '52', '动物', '付费', '小琳', '5', '否', '2026-06-18'],
        ]
      : [
          ['可爱小猫', '小七', '52', '动物', '付费', '晴儿', '9.9', '是', '2026-06-20'],
          ['樱花树下', '阿豆', '120', '风景', '免费', '', '', '否', '2026-06-18'],
        ]
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...example])
  sheet['!cols'] = headers.map(() => ({ wch: 14 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, category === 'member' ? '会员图纸' : '普通图纸')
  const fileName = category === 'member' ? '拼豆图纸导入模板-会员图纸.xlsx' : '拼豆图纸导入模板-普通图纸.xlsx'
  XLSX.writeFile(workbook, fileName)
}

export async function parsePatternExcelFile(file, category = 'member') {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel 文件中没有工作表')
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  })

  if (!rows.length) {
    throw new Error('Excel 文件为空')
  }

  const headerRow = rows[0]
  const columnIndexMap = {}

  const templateHeaders = getTemplateHeaders(category)

  headerRow.forEach((header, index) => {
    const key = findColumnKey(header)
    if (key && columnIndexMap[key] === undefined) {
      columnIndexMap[key] = index
    }
  })

  const missingColumns = templateHeaders.filter((header) => {
    const key = findColumnKey(header)
    return key && key !== 'price' && key !== 'valueAmount' && columnIndexMap[key] === undefined
  })

  if (missingColumns.length) {
    throw new Error(`缺少必要列：${missingColumns.join('、')}`)
  }

  const hasValueAmountColumn = category === 'member' && columnIndexMap.valueAmount !== undefined

  const parsedRows = []

  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2
    const isEmpty = !cells || cells.every((cell) => cellText(cell) === '')
    if (isEmpty) return

    const typeResult = parseType(cells[columnIndexMap.type], category)
    const priceResult =
      category === 'normal' && columnIndexMap.price !== undefined
        ? parsePrice(cells[columnIndexMap.price])
        : { price: null, error: '' }
    const valueAmountResult =
      hasValueAmountColumn ? parseAmount(cells[columnIndexMap.valueAmount]) : { amount: null, error: '' }

    const row = {
      name: cellText(cells[columnIndexMap.name]),
      author: cellText(cells[columnIndexMap.author]),
      size: cellText(cells[columnIndexMap.size]),
      patternCategory: cellText(cells[columnIndexMap.patternCategory]),
      type: typeResult.type,
      typeError: typeResult.error,
      buyer: cellText(cells[columnIndexMap.buyer]),
      price: priceResult.price,
      priceError: priceResult.error,
      valueAmount: valueAmountResult.amount,
      valueAmountError: valueAmountResult.error,
      hasValueAmountColumn,
      completed: parseCompleted(cells[columnIndexMap.completed]),
      date: parseExcelDate(cells[columnIndexMap.date]),
      markDelete: false,
      image: '',
    }

    parsedRows.push(validateRow(row, rowNumber, category))
  })

  if (!parsedRows.length) {
    throw new Error('Excel 中没有可导入的数据行')
  }

  return parsedRows
}

export function revalidateImportRows(rows, category = 'member') {
  return rows.map((row) =>
    validateRow(
      {
        name: row.name,
        author: row.author,
        authorRaw: row.authorRaw || row.author || '',
        size: row.size,
        patternCategory: row.patternCategory,
        type: row.type,
        typeError: row.typeError || '',
        buyer: row.buyer,
        price: row.price ?? null,
        priceError: row.priceError || '',
        valueAmount: row.valueAmount ?? null,
        valueAmountError: row.valueAmountError || '',
        hasValueAmountColumn: row.hasValueAmountColumn === true,
        completed: row.completed,
        date: row.date,
        markDelete: row.markDelete === true,
        forceUpload: row.forceUpload === true,
        image: row.image || '',
      },
      row.rowNumber,
      category
    )
  )
}

/** 图纸名称 + 作者 唯一标识（删除匹配用） */
export function buildPatternIdentityKey(name, author) {
  const normalizedName = cellText(name)
  const normalizedAuthor = cellText(author)
  if (!normalizedName || !normalizedAuthor) return ''
  return `${normalizedName}||${normalizedAuthor}`
}

/** 将 Excel 作者名模糊对应到已有作者（如「小野」→「小野茉纱」、「奶糖」→「穗穗奶糖」），避免新建作者 */
export function resolveAuthorName(input, existingAuthors = [], authorFrequency = null) {
  const raw = cellText(input)
  if (!raw) return ''

  const authors = [
    ...new Set((existingAuthors || []).map((name) => cellText(name)).filter(Boolean)),
  ]
  if (!authors.length) return raw

  const freqOf = (name) => authorFrequency?.get?.(name) || 0

  const pickBest = (matches) => {
    if (!matches.length) return ''
    if (matches.length === 1) return matches[0]
    return [...matches].sort((a, b) => {
      const freqA = freqOf(a)
      const freqB = freqOf(b)
      if (freqA !== freqB) return freqB - freqA
      // 截断短名归并时优先更长正式名（奶糖 → 穗穗奶糖）
      if (a.length !== b.length) return b.length - a.length
      return a.localeCompare(b, 'zh-CN')
    })[0]
  }

  /** 前缀/后缀延长名：小野→小野茉纱，奶糖→穗穗奶糖 */
  const longerAffixMatches = authors.filter(
    (name) =>
      name !== raw
      && name.length > raw.length
      && (name.startsWith(raw) || name.endsWith(raw)),
  )

  const exact = authors.find((name) => name === raw)
  const exactIgnoreCase = authors.find(
    (name) => name.toLowerCase() === raw.toLowerCase(),
  )
  const exactHit = exact || exactIgnoreCase || ''

  // 短名已存在时，仍优先归到更长正式名（奶糖→穗穗奶糖；避免截断名继续新建）
  if (exactHit && longerAffixMatches.length && raw.length >= 2) {
    const longerHit = pickBest(longerAffixMatches)
    if (longerHit) return longerHit
  }
  if (exactHit) return exactHit

  const prefixHit = pickBest(
    authors.filter((name) => name.startsWith(raw) && name !== raw),
  )
  if (prefixHit) return prefixHit

  const suffixHit = pickBest(
    authors.filter((name) => name.endsWith(raw) && name !== raw),
  )
  if (suffixHit) return suffixHit

  const containsHit = pickBest(
    authors.filter((name) => name.includes(raw) && name !== raw),
  )
  if (containsHit) return containsHit

  return raw
}

export function buildAuthorFrequencyMap(patterns = []) {
  const map = new Map()
  ;(patterns || []).forEach((item) => {
    const name = cellText(item?.author)
    if (!name) return
    map.set(name, (map.get(name) || 0) + 1)
  })
  return map
}

export function collectExistingAuthorNames(patterns = [], extraNames = []) {
  const set = new Set()
  ;(patterns || []).forEach((item) => {
    const name = cellText(item?.author)
    if (name) set.add(name)
  })
  ;(extraNames || []).forEach((name) => {
    const normalized = cellText(name)
    if (normalized) set.add(normalized)
  })
  return [...set]
}

/** 图纸名称 + 作者 + 规格（导入冲突判断用） */
export function buildPatternDuplicateKey(name, author, size) {
  const normalizedName = cellText(name)
  const normalizedAuthor = cellText(author)
  const normalizedSize = cellText(size)
  if (!normalizedName || !normalizedAuthor || !normalizedSize) return ''
  return `${normalizedName}||${normalizedAuthor}||${normalizedSize}`
}

export function findPatternByIdentity(patterns, name, author) {
  const key = buildPatternIdentityKey(name, author)
  if (!key) return null
  return (
    patterns.find((item) => buildPatternIdentityKey(item.name, item.author) === key) || null
  )
}

export function findPatternByDuplicateKey(patterns, name, author, size) {
  const key = buildPatternDuplicateKey(name, author, size)
  if (!key) return null
  return (
    patterns.find(
      (item) => buildPatternDuplicateKey(item.name, item.author, item.size) === key,
    ) || null
  )
}

export function appendImportRowError(row, message) {
  if ((row.errors || []).includes(message)) return row
  const errors = [...(row.errors || []), message]
  return { ...row, errors, valid: false }
}

export const EXISTING_DUPLICATE_ERROR = '系统中已存在同名同作者同规格图纸'

function withoutExistingDuplicateError(row) {
  const errors = (row.errors || []).filter((item) => item !== EXISTING_DUPLICATE_ERROR)
  return {
    ...row,
    errors,
    valid: errors.length === 0,
  }
}

/** 校验 Excel 内重复及与系统中已有图纸（同名同作者同规格）冲突 */
export function applyImportDuplicateChecks(rows, existingPatterns = []) {
  const importDuplicateKeys = new Map()

  rows.forEach((row) => {
    if (row.markDelete || !row.valid) return
    const key = buildPatternDuplicateKey(row.name, row.author, row.size)
    if (!key) return
    importDuplicateKeys.set(key, (importDuplicateKeys.get(key) || 0) + 1)
  })

  return rows.map((row) => {
    if (row.markDelete) {
      return { ...row, duplicateExisting: false, forceUpload: false, existingPattern: null }
    }

    let next = withoutExistingDuplicateError(row)
    const key = buildPatternDuplicateKey(row.name, row.author, row.size)
    const existing = key
      ? findPatternByDuplicateKey(existingPatterns, row.name, row.author, row.size)
      : null
    const duplicateExisting = Boolean(existing)

    if (key && importDuplicateKeys.get(key) > 1) {
      next = appendImportRowError(next, 'Excel 内存在同名同作者同规格重复行')
    }
    if (duplicateExisting && !row.forceUpload) {
      next = appendImportRowError(next, EXISTING_DUPLICATE_ERROR)
    }

    return {
      ...next,
      duplicateExisting,
      forceUpload: duplicateExisting ? row.forceUpload === true : false,
      existingPattern: existing
        ? {
            id: existing.id,
            name: existing.name || '',
            hasImage: Boolean(existing.hasImage || String(existing.image || '').trim()),
            image: existing.image || '',
          }
        : null,
    }
  })
}

export function toPatternPayload(row, category = 'member', { memberPatterns = [] } = {}) {
  const payload = {
    name: row.name,
    author: row.author,
    size: row.size,
    patternCategory: row.patternCategory,
    type: row.type,
    buyer: String(row.buyer || '').trim() || '晴儿',
    price: row.price ?? null,
    completed: row.completed === true,
    date: row.date,
    image: '',
  }

  if (category === 'member') {
    if (row.valueAmount != null) {
      payload.valueAmount = row.valueAmount
    } else if (row.type === 'free') {
      payload.valueAmount = null
    } else if (row.type === 'member') {
      // 类型为会员且未填金额：按该作者付费图纸价格逻辑计价
      const paidRefs = collectAuthorPaidAmountRefs(memberPatterns, row.author)
      payload.valueAmount = getMemberValueAmountByAuthorPaid(row.size, paidRefs)
    } else if (row.type === 'paid' && row.hasValueAmountColumn) {
      payload.valueAmount = 3
    }
  }

  return payload
}

function splitQuickPasteLine(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.includes('\t')) {
    return raw.split('\t').map((part) => cellText(part))
  }
  if (raw.includes('|')) {
    return raw.split('|').map((part) => cellText(part))
  }
  const commaCount = (raw.match(/,/g) || []).length
  if (commaCount >= 3) {
    return raw.split(',').map((part) => cellText(part))
  }
  return [raw]
}

export function getPatternQuickPasteHint(category = 'member') {
  return category === 'member'
    ? '图纸名称、作者、规格、类别、类型、购买人、是否完成、日期'
    : '图纸名称、作者、规格、类别、类型、购买人、价格、是否完成、日期（价格可省略）'
}

/** 粘贴一行 Tab 分隔文本，按 Excel 模板列顺序填入表单 */
export function parsePatternQuickPaste(text, category = 'member') {
  const parts = splitQuickPasteLine(text).filter((part) => part !== '')
  if (!parts.length) {
    return { ok: false, error: '请粘贴一行图纸信息' }
  }
  if (parts.length === 1) {
    return { ok: false, error: '请用 Tab 分隔各字段（从 Excel 复制一行即可）' }
  }

  const isMember = category === 'member'
  if (isMember && parts.length !== 8) {
    return {
      ok: false,
      error: '会员图纸需 8 段：名称、作者、规格、类别、类型、购买人、是否完成、日期',
    }
  }
  if (!isMember && parts.length !== 8 && parts.length !== 9) {
    return {
      ok: false,
      error: '普通图纸需 8～9 段，缺价格时可省略价格字段',
    }
  }

  let name
  let author
  let size
  let patternCategory
  let typeText
  let buyer
  let priceText = ''
  let completedText
  let dateText

  if (isMember) {
    ;[name, author, size, patternCategory, typeText, buyer, completedText, dateText] = parts
  } else if (parts.length === 8) {
    ;[name, author, size, patternCategory, typeText, buyer, completedText, dateText] = parts
  } else {
    ;[name, author, size, patternCategory, typeText, buyer, priceText, completedText, dateText] = parts
  }

  const typeResult = parseType(typeText, category)
  if (typeResult.error) {
    return { ok: false, error: typeResult.error }
  }

  const priceResult = !isMember && priceText ? parsePrice(priceText) : { price: null, error: '' }
  if (priceResult.error) {
    return { ok: false, error: priceResult.error }
  }

  const completed = parseCompleted(completedText)
  if (completedText && completed === null) {
    return { ok: false, error: '是否完成需为：是 / 否（或 已完成 / 未完成）' }
  }

  const row = validateRow(
    {
      name,
      author,
      size,
      patternCategory,
      type: typeResult.type,
      typeError: '',
      buyer,
      price: priceResult.price,
      priceError: '',
      completed: completed ?? false,
      date: parseExcelDate(dateText),
      image: '',
    },
    1,
    category,
  )

  if (!row.valid) {
    return { ok: false, error: row.errors.join('；') }
  }

  return { ok: true, data: row }
}
