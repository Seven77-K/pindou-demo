/** 筛选下拉用的规格档位 */
export const sizeFilterOptions = ['52', '78', '104', '120', '130', '超过130']

const SIZE_THRESHOLDS = [
  { max: 52, category: '52' },
  { max: 78, category: '78' },
  { max: 104, category: '104' },
  { max: 120, category: '120' },
  { max: 130, category: '130' },
]

/** 从规格文本提取用于计价的边长：格式为 数字*数字，取较大边（任一单边超档即按该档计价） */
export function parseSizeNumber(sizeText) {
  if (!sizeText && sizeText !== 0) return null
  const text = String(sizeText).trim()
  if (!text) return null
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || []
  if (!numbers.length) return null
  return Math.max(...numbers)
}

/**
 * 会员类型图纸全局默认金额（作者无付费样本时回退）
 * 按规格较大边：≤140→3；≤160→5；≤180→8；≤200→8.8；>200→9.9
 */
export function getMemberValueAmountBySize(sizeText) {
  const size = parseSizeNumber(sizeText)
  if (size == null) return 3
  if (size <= 140) return 3
  if (size <= 160) return 5
  if (size <= 180) return 8
  if (size <= 200) return 8.8
  return 9.9
}

function normalizePositiveAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num * 100) / 100
}

/**
 * 从作者付费图纸样本归纳：规格较大边 → 众数金额
 * paidRefs: [{ size, amount|valueAmount }]
 */
export function buildAuthorPaidSizeAmountIndex(paidRefs = []) {
  const bucketMap = new Map()
  ;(paidRefs || []).forEach((item) => {
    const size = parseSizeNumber(item?.size)
    const amount = normalizePositiveAmount(item?.amount ?? item?.valueAmount)
    if (size == null || amount == null) return
    if (!bucketMap.has(size)) bucketMap.set(size, new Map())
    const counts = bucketMap.get(size)
    counts.set(amount, (counts.get(amount) || 0) + 1)
  })

  return [...bucketMap.entries()]
    .map(([size, counts]) => {
      const best = [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || b[0] - a[0],
      )[0]
      return { size, amount: best[0] }
    })
    .sort((a, b) => a.size - b.size)
}

/** 按作者付费图纸规格金额：同规格优先，否则取最接近规格 */
export function resolveAmountFromAuthorPaid(sizeText, paidRefs = []) {
  const index = buildAuthorPaidSizeAmountIndex(paidRefs)
  if (!index.length) return null

  const target = parseSizeNumber(sizeText)
  if (target == null) return null

  let best = index[0]
  let bestDist = Math.abs(best.size - target)
  for (let i = 1; i < index.length; i += 1) {
    const row = index[i]
    const dist = Math.abs(row.size - target)
    if (dist < bestDist) {
      best = row
      bestDist = dist
      continue
    }
    // 距离相同：优先不大于目标规格的档（更保守）
    if (dist === bestDist && row.size <= target && best.size > target) {
      best = row
    }
  }
  return best.amount
}

/** 会员类型金额下限 */
export const MEMBER_TYPE_MIN_AMOUNT = 3

function applyMemberTypeMinAmount(amount) {
  const num = Number(amount)
  if (!Number.isFinite(num)) return MEMBER_TYPE_MIN_AMOUNT
  return Math.max(MEMBER_TYPE_MIN_AMOUNT, Math.round(num * 100) / 100)
}

/**
 * 会员类型金额：优先按该作者付费图纸价格逻辑，否则回退全局规格档位；最低 3
 * paidRefs: 该作者 type=paid 的 [{ size, valueAmount|amount }]
 */
export function getMemberValueAmountByAuthorPaid(sizeText, paidRefs = []) {
  const fromPaid = resolveAmountFromAuthorPaid(sizeText, paidRefs)
  if (fromPaid != null) return applyMemberTypeMinAmount(fromPaid)
  return applyMemberTypeMinAmount(getMemberValueAmountBySize(sizeText))
}

/** 系列合作后缀：阿豆 / 阿豆秋秋 / 阿豆Nami 视为同一作者族，共用付费定价样本 */
const AUTHOR_SERIES_SUFFIXES = ['秋秋', 'Nami', 'nami']

function stripAuthorSeriesSuffix(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  for (const suffix of AUTHOR_SERIES_SUFFIXES) {
    if (text.length > suffix.length && text.endsWith(suffix)) {
      return text.slice(0, -suffix.length).trim()
    }
  }
  return text
}

/** 同一作者族名字：精确名 + 去掉/加上系列后缀后的相关名 */
export function getRelatedAuthorNames(authors = [], author = '') {
  const name = String(author || '').trim()
  if (!name) return []
  const base = stripAuthorSeriesSuffix(name)
  const names = [
    ...new Set((authors || []).map((item) => String(item || '').trim()).filter(Boolean)),
  ]
  const related = new Set([name])
  if (base) related.add(base)
  names.forEach((other) => {
    const otherBase = stripAuthorSeriesSuffix(other)
    if (other === name || other === base || otherBase === base || otherBase === name) {
      related.add(other)
    }
  })
  return [...related]
}

/** 从会员图纸列表收集某作者（含系列别名）的付费样本 */
export function collectAuthorPaidAmountRefs(patterns = [], author = '') {
  const name = String(author || '').trim()
  if (!name) return []
  const authorPool = (patterns || []).map((item) => item?.author)
  const related = new Set(getRelatedAuthorNames(authorPool, name))
  return (patterns || [])
    .filter((item) => related.has(String(item?.author || '').trim()) && item?.type === 'paid')
    .map((item) => ({
      size: item.size,
      amount: item.valueAmount,
    }))
}

/**
 * 根据用户填写的规格文本（如 100*160）判断筛选档位
 * 表格与编辑仍展示原文，仅筛选用档位
 */
export function getSizeFilterCategory(sizeText) {
  if (!sizeText) return ''

  const text = String(sizeText).trim()
  if (!text) return ''

  if (sizeFilterOptions.includes(text)) {
    return text
  }

  const max = parseSizeNumber(text)
  if (max == null) return ''

  for (const { max: threshold, category } of SIZE_THRESHOLDS) {
    if (max <= threshold) return category
  }

  return '超过130'
}

export function matchSizeFilter(sizeText, filterValue) {
  if (!filterValue) return true
  return getSizeFilterCategory(sizeText) === filterValue
}
