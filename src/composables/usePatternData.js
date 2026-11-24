import { ref } from 'vue'
import {
  createPattern as apiCreate,
  createPatternsBatch as apiCreateBatch,
  convertPatternToMember as apiConvertToMember,
  deletePattern as apiDelete,
  fetchPatternImage,
  fetchPatterns as apiFetch,
  updatePattern as apiUpdate,
} from '@/api/pattern'
import { normalizeAuthorAmount } from '@/composables/useAuthorAmounts'
import { sizeFilterOptions as sizeOptions } from '@/utils/patternSize'

const memberPatterns = ref([])
const normalPatterns = ref([])
const loading = ref(false)
const loaded = ref(false)
const patternImageCache = ref({})
const patternImageLoading = new Set()
let loadingPromise = null

const IMAGE_LOAD_CONCURRENCY = 3
const imageLoadQueue = []
let imageLoadActive = 0

function drainImageLoadQueue() {
  while (imageLoadActive < IMAGE_LOAD_CONCURRENCY && imageLoadQueue.length) {
    const job = imageLoadQueue.shift()
    imageLoadActive += 1
    job
      .fn()
      .then(job.resolve, job.reject)
      .finally(() => {
        imageLoadActive -= 1
        drainImageLoadQueue()
      })
  }
}

function enqueueImageLoad(fn) {
  return new Promise((resolve, reject) => {
    imageLoadQueue.push({ fn, resolve, reject })
    drainImageLoadQueue()
  })
}

function patchPatternInList(category, id, patch) {
  const targetList = category === 'member' ? memberPatterns : normalPatterns
  const index = targetList.value.findIndex((item) => item.id === id)
  if (index > -1) {
    targetList.value[index] = { ...targetList.value[index], ...patch }
  }
}

export function getPatternImage(item) {
  if (!item) return ''
  if (item.image?.trim()) return item.image
  return patternImageCache.value[item.id] || ''
}

export function hasPatternImageFlag(item) {
  return Boolean(item?.image?.trim() || item?.hasImage || patternImageCache.value[item?.id])
}

export async function loadPatternImage(id, category) {
  if (!id || patternImageCache.value[id] || patternImageLoading.has(id)) {
    return patternImageCache.value[id] || ''
  }

  patternImageLoading.add(id)
  try {
    const image = await enqueueImageLoad(() => fetchPatternImage(id))
    if (image) {
      patternImageCache.value = { ...patternImageCache.value, [id]: image }
      if (category) {
        patchPatternInList(category, id, { image, hasImage: true })
      }
      return image
    }
    return ''
  } finally {
    patternImageLoading.delete(id)
  }
}

export async function loadPatternImages(items, category) {
  const pending = items.filter(
    (item) => item?.id && item.hasImage && !getPatternImage(item)
  )
  await Promise.all(pending.map((item) => loadPatternImage(item.id, category)))
}

export const buyerOptions = ['晴儿', '小琳']
export const DEFAULT_PATTERN_BUYER = '晴儿'

/** 购买人为空时默认晴儿 */
export function resolvePatternBuyer(value) {
  const text = String(value || '').trim()
  return text || DEFAULT_PATTERN_BUYER
}

export { sizeOptions }

export const patternTypeLabels = {
  free: '免费',
  paid: '付费',
  member: '会员',
}

export const patternTypeOptions = [
  { value: 'free', label: '免费' },
  { value: 'paid', label: '付费' },
  { value: 'member', label: '会员' },
]

const USER_KEY = 'pindou-admin-user'
const TOKEN_KEY = 'pindou-admin-token'

function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function getStoredUserId() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw).id ?? null : null
  } catch {
    return null
  }
}

let loadedUserId = null

export async function loadPatterns(force = false) {
  if (!getAuthToken()) {
    clearPatterns()
    return { member: [], normal: [] }
  }

  const userId = getStoredUserId()
  const userChanged = loadedUserId !== null && userId !== loadedUserId
  const shouldForce = force || userChanged

  if (loadingPromise && !shouldForce) {
    return loadingPromise
  }

  if (loaded.value && !shouldForce && loadedUserId === userId) {
    return { member: memberPatterns.value, normal: normalPatterns.value }
  }

  loading.value = true
  loadingPromise = apiFetch()
    .then((data) => {
      if (!getAuthToken()) {
        return { member: [], normal: [] }
      }
      memberPatterns.value = data.member || []
      normalPatterns.value = data.normal || []
      loaded.value = true
      loadedUserId = userId
      return data
    })
    .catch((error) => {
      const message = error.message || ''
      if (
        !getAuthToken() ||
        message === 'LOGIN_EXPIRED' ||
        message.includes('登录已过期') ||
        message.includes('离线登录')
      ) {
        clearPatterns()
        return { member: [], normal: [] }
      }
      return Promise.reject(error)
    })
    .finally(() => {
      loading.value = false
      loadingPromise = null
    })

  return loadingPromise
}

export function clearPatterns() {
  memberPatterns.value = []
  normalPatterns.value = []
  loaded.value = false
  loadedUserId = null
  loading.value = false
  loadingPromise = null
  patternImageCache.value = {}
  patternImageLoading.clear()
  imageLoadQueue.length = 0
}

export async function createPattern(category, data) {
  const created = await apiCreate(category, data)
  if (created?.image) {
    patternImageCache.value = { ...patternImageCache.value, [created.id]: created.image }
  }
  if (category === 'member') {
    memberPatterns.value = [created, ...memberPatterns.value]
  } else {
    normalPatterns.value = [created, ...normalPatterns.value]
  }
  return created
}

export async function createPatternsBatch(category, items) {
  const created = await apiCreateBatch(category, items)
  await loadPatterns(true)
  return created
}

export async function updatePattern(id, category, data) {
  const updated = await apiUpdate(id, data)
  const patch = { ...updated, image: '' }
  if (updated?.image) {
    patternImageCache.value = { ...patternImageCache.value, [id]: updated.image }
  } else if (updated && !updated.hasImage) {
    const next = { ...patternImageCache.value }
    delete next[id]
    patternImageCache.value = next
  }
  patchPatternInList(category, id, patch)
  return updated
}

export async function deletePattern(id, category) {
  await apiDelete(id)
  const targetList = category === 'member' ? memberPatterns : normalPatterns
  targetList.value = targetList.value.filter((item) => item.id !== id)
  if (patternImageCache.value[id]) {
    const next = { ...patternImageCache.value }
    delete next[id]
    patternImageCache.value = next
  }
}

export async function deletePatterns(ids, category) {
  if (!ids.length) return
  await Promise.all(ids.map((id) => apiDelete(id)))
  const targetList = category === 'member' ? memberPatterns : normalPatterns
  const idSet = new Set(ids)
  targetList.value = targetList.value.filter((item) => !idSet.has(item.id))
}

export async function convertPatternToMember(id, data = {}) {
  const converted = await apiConvertToMember(id, data)
  const cachedImage = patternImageCache.value[id]

  normalPatterns.value = normalPatterns.value.filter((item) => item.id !== id)

  if (cachedImage || converted?.image) {
    const next = { ...patternImageCache.value }
    delete next[id]
    if (converted?.image || cachedImage) {
      next[converted.id] = converted.image || cachedImage
    }
    patternImageCache.value = next
  } else if (patternImageCache.value[id]) {
    const next = { ...patternImageCache.value }
    delete next[id]
    patternImageCache.value = next
  }

  memberPatterns.value = [converted, ...memberPatterns.value]
  return converted
}

/** 是否已完成（兼容接口返回的布尔/数字/字符串） */
export function isPatternCompleted(item) {
  if (!item) return false
  return item.completed === true || item.completed === 1 || item.completed === 'true'
}

function normalizeAssembleDateKey(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10))) return text.slice(0, 10)
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`
}

/** 首次完成日期 + 重拼日期（去重，新→旧） */
export function listPatternAssembleDates(item) {
  const set = new Set()
  const completed = normalizeAssembleDateKey(item?.completedDate)
  if (completed) set.add(completed)
  if (item?.isRepeat === true || item?.isRepeat === 1 || item?.isRepeat === 'true') {
    ;(Array.isArray(item.reassembleDates) ? item.reassembleDates : []).forEach((date) => {
      const key = normalizeAssembleDateKey(date)
      if (key) set.add(key)
    })
  }
  return [...set].sort((a, b) => b.localeCompare(a))
}

/** 表格「完成日期」：有重拼时取最后一次拼完 */
export function getLatestPatternAssembleDate(item) {
  if (!isPatternCompleted(item)) return ''
  return listPatternAssembleDates(item)[0] || ''
}

/** 按作者统计已完成图纸：免费 / 会员 / 付费（按完成数量从多到少，左→右） */
export function buildCompletionChartData(list, { includeMemberType = true } = {}) {
  const authorMap = {}

  list.forEach((item) => {
    if (!item.author || !isPatternCompleted(item)) return
    if (!authorMap[item.author]) {
      authorMap[item.author] = { free: 0, member: 0, paid: 0 }
    }
    const bucket = authorMap[item.author]
    if (item.type === 'paid') {
      bucket.paid += 1
    } else if (item.type === 'member' && includeMemberType) {
      bucket.member += 1
    } else {
      bucket.free += 1
    }
  })

  const rows = Object.entries(authorMap)
    .map(([author, counts]) => ({
      author,
      ...counts,
      total: counts.free + counts.member + counts.paid,
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.author.localeCompare(b.author, 'zh-CN'),
    )

  return {
    authors: rows.map((row) => row.author),
    freeData: rows.map((row) => row.free),
    memberData: rows.map((row) => row.member),
    paidData: rows.map((row) => row.paid),
    includeMemberType,
  }
}

/** 按作者统计已完成图纸总数（饼图） */
export function buildAuthorCompletionPieData(list) {
  const authorMap = {}

  list.forEach((item) => {
    if (!item.author || !isPatternCompleted(item)) return
    authorMap[item.author] = (authorMap[item.author] || 0) + 1
  })

  return Object.entries(authorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'zh-CN'))
}

/** 每位作者的拼完占比：已完成数 / 该作者图纸总数 */
export function buildAuthorCompletionRateData(list) {
  const authorMap = {}

  list.forEach((item) => {
    if (!item.author) return
    if (!authorMap[item.author]) {
      authorMap[item.author] = { total: 0, completed: 0 }
    }
    authorMap[item.author].total += 1
    if (isPatternCompleted(item)) {
      authorMap[item.author].completed += 1
    }
  })

  return Object.entries(authorMap)
    .map(([name, { total, completed }]) => ({
      name,
      completed,
      total,
      value: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

const sortCompletedPatterns = (a, b) => {
  const dateCmp = (b.date || '').localeCompare(a.date || '')
  if (dateCmp !== 0) return dateCmp
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
}

function filterAuthorPatterns(list, author, { buyer = '', predicate } = {}) {
  const key = String(author || '').trim()
  if (!key) return []

  const buyerKey = String(buyer || '').trim()

  return list
    .filter((item) => {
      if (item.author?.trim() !== key) return false
      if (buyerKey && item.buyer !== buyerKey) return false
      if (typeof predicate === 'function' && !predicate(item)) return false
      return true
    })
    .sort(sortCompletedPatterns)
}

/** 指定作者全部图纸列表 */
export function getAuthorPatterns(list, author, { buyer = '' } = {}) {
  return filterAuthorPatterns(list, author, { buyer })
}

/** 指定作者已拼完图纸列表 */
export function getAuthorCompletedPatterns(list, author, { buyer = '' } = {}) {
  return filterAuthorPatterns(list, author, {
    buyer,
    predicate: (item) => isPatternCompleted(item),
  })
}

/** 指定作者付费图纸列表 */
export function getAuthorPaidPatterns(list, author, { buyer = '' } = {}) {
  return filterAuthorPatterns(list, author, {
    buyer,
    predicate: (item) => item.type === 'paid',
  })
}

/** 已出图纸金额明细：会员图 + 付费图 */
export function getAuthorReleasedPatterns(list, author, { buyer = '' } = {}) {
  return filterAuthorPatterns(list, author, {
    buyer,
    predicate: (item) => item.type === 'paid' || item.type === 'member',
  })
}

function isReleasedPatternType(type) {
  return type === 'paid' || type === 'member'
}

function matchesTypeCompletionKey(item, typeKey, { includeMemberType = true } = {}) {
  if (typeKey === 'all') return true
  if (typeKey === 'paid') return item.type === 'paid'
  if (typeKey === 'member') return item.type === 'member' && includeMemberType
  if (item.type === 'paid') return false
  if (item.type === 'member' && includeMemberType) return false
  return true
}

/** 指定类型已拼完图纸列表 */
export function getTypeCompletedPatterns(list, typeKey, { includeMemberType = true } = {}) {
  const key = String(typeKey || '').trim()
  if (!key) return []

  return list
    .filter((item) => matchesTypeCompletionKey(item, key, { includeMemberType }) && isPatternCompleted(item))
    .sort(sortCompletedPatterns)
}

/** 按图纸类型统计拼完占比：全部 / 免费 / 会员 / 付费 */
export function buildTypeCompletionRateData(list, { includeMemberType = true } = {}) {
  const groups = {
    free: { name: '免费图纸', total: 0, completed: 0 },
    member: { name: '会员图纸', total: 0, completed: 0 },
    paid: { name: '付费图纸', total: 0, completed: 0 },
  }

  let allTotal = 0
  let allCompleted = 0

  list.forEach((item) => {
    let key = 'free'
    if (item.type === 'paid') key = 'paid'
    else if (item.type === 'member' && includeMemberType) key = 'member'

    groups[key].total += 1
    allTotal += 1
    if (isPatternCompleted(item)) {
      groups[key].completed += 1
      allCompleted += 1
    }
  })

  const typeKeys = includeMemberType ? ['free', 'member', 'paid'] : ['free', 'paid']
  const typeRows = typeKeys.map((key) => {
    const { name, total, completed } = groups[key]
    return {
      key,
      name,
      total,
      completed,
      value: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  return [
    {
      key: 'all',
      name: '全部图纸',
      total: allTotal,
      completed: allCompleted,
      value: allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0,
    },
    ...typeRows,
  ]
}

/** 汇总会员图纸作者统计（不含普通图纸） */
export function buildAuthorSummaryList(memberList, { buyer = '' } = {}) {
  const map = {}
  const buyerKeyword = String(buyer || '').trim()

  const add = (item) => {
    if (buyerKeyword && item.buyer !== buyerKeyword) return

    const name = item.author?.trim()
    if (!name) return
    if (!map[name]) {
      map[name] = {
        name,
        total: 0,
        free: 0,
        paid: 0,
        member: 0,
        completed: 0,
        pending: 0,
        releasedAmount: 0,
        completedAmount: 0,
        lastUpdateDate: '',
        buyerCounts: {},
      }
    }
    map[name].total += 1
    // 已出图纸金额：只计会员图 + 付费图
    if (isReleasedPatternType(item.type)) {
      map[name].releasedAmount += normalizeAuthorAmount(item.valueAmount)
    }
    if (item.type === 'paid') map[name].paid += 1
    else if (item.type === 'member') map[name].member += 1
    else map[name].free += 1
    if (isPatternCompleted(item)) {
      map[name].completed += 1
      map[name].completedAmount += normalizeAuthorAmount(item.valueAmount)
    } else {
      map[name].pending += 1
    }

    const patternDate = String(item.date || '').trim().slice(0, 10)
    if (patternDate && patternDate > map[name].lastUpdateDate) {
      map[name].lastUpdateDate = patternDate
    }

    const buyerName = item.buyer?.trim()
    if (buyerName) {
      map[name].buyerCounts[buyerName] = (map[name].buyerCounts[buyerName] || 0) + 1
    }
  }

  const pickTopBuyer = (buyerCounts) => {
    const entries = Object.entries(buyerCounts)
    if (!entries.length) return '—'
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    return entries[0][0]
  }

  memberList.forEach(add)

  return Object.values(map)
    .map((row) => ({
      name: row.name,
      total: row.total,
      free: row.free,
      paid: row.paid,
      member: row.member,
      completed: row.completed,
      pending: row.pending,
      releasedAmount: Math.round(row.releasedAmount * 100) / 100,
      completedAmount: Math.round(row.completedAmount * 100) / 100,
      lastUpdateDate: row.lastUpdateDate || '',
      buyer: pickTopBuyer(row.buyerCounts),
      rate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

/** 某作者按图纸类型的饼图数据（仅会员图纸） */
export function buildAuthorTypePieData(authorName, memberList) {
  const list = memberList.filter((item) => item.author?.trim() === authorName)

  let free = 0
  let paid = 0
  let member = 0

  list.forEach((item) => {
    if (item.type === 'paid') paid += 1
    else if (item.type === 'member') member += 1
    else free += 1
  })

  return [
    { name: '免费图纸', value: free },
    { name: '会员图纸', value: member },
    { name: '付费图纸', value: paid },
  ].filter((item) => item.value > 0)
}

export function usePatternData() {
  return {
    memberPatterns,
    normalPatterns,
    loading,
    loaded,
    patternImageCache,
    loadPatterns,
    clearPatterns,
    loadPatternImage,
    loadPatternImages,
    getPatternImage,
    hasPatternImageFlag,
    createPattern,
    createPatternsBatch,
    updatePattern,
    deletePattern,
    deletePatterns,
    convertPatternToMember,
    buyerOptions,
    sizeOptions,
    patternTypeLabels,
    patternTypeOptions,
    buildCompletionChartData,
    buildAuthorCompletionPieData,
    buildAuthorCompletionRateData,
    getAuthorPatterns,
    getAuthorCompletedPatterns,
    getAuthorPaidPatterns,
    getAuthorReleasedPatterns,
    getTypeCompletedPatterns,
    buildTypeCompletionRateData,
    buildAuthorSummaryList,
    buildAuthorTypePieData,
    isPatternCompleted,
  }
}
