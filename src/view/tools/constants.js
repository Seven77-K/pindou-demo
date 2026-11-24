import { reactive } from 'vue'

export const BOARD_SIZES = ['30×30', '52×52', '52×104', '78×78', '80×80', '60×120', '104×104', '120×120', '130×130']

export const BOARD_STATUS_OPTIONS = [
  { value: '在用', label: '在用' },
  { value: '在途', label: '在途' },
  { value: '已售', label: '已售' },
  { value: '送人', label: '送人' },
  { value: '损耗', label: '损耗' },
]

export const BOARD_DEFECT_OPTIONS = [
  { value: '无暇', label: '无暇' },
  { value: '微瑕', label: '微瑕' },
  { value: '重瑕', label: '重瑕' },
  { value: '-', label: '-' },
]

export const BOARD_ALL_SLUG = 'all'

const BOARD_STORAGE_PREFIX = 'pindou-admin-board-inventory'
const LEGACY_BOARD_STORAGE_KEY = 'pindou-admin-board-inventory'

export const toBoardSlug = (size) => String(size).replace(/[×*]/g, 'x')

export const fromBoardSlug = (slug) => String(slug).replace(/x/g, '×')

export const isBoardSlug = (slug) =>
  slug === BOARD_ALL_SLUG || BOARD_SIZES.some((size) => toBoardSlug(size) === slug)

export const getBoardDisplayName = (slug) => {
  if (slug === BOARD_ALL_SLUG) return '全部'
  if (BOARD_SIZES.some((size) => toBoardSlug(size) === slug)) return fromBoardSlug(slug)
  return slug
}

/** 仅「在用」计入库存/共计条数 */
export const isBoardInUse = (item) => (item?.status || '在用') === '在用'

const buildEmptyInventory = () =>
  Object.fromEntries(BOARD_SIZES.map((size) => [toBoardSlug(size), []]))

export const boardInventory = reactive(buildEmptyInventory())

let boardIdSeq = 1
let currentStorageUserId = null

function storageKey(userId) {
  return userId ? `${BOARD_STORAGE_PREFIX}-${userId}` : LEGACY_BOARD_STORAGE_KEY
}

function resetBoardInventory() {
  const empty = buildEmptyInventory()
  Object.keys(boardInventory).forEach((key) => {
    delete boardInventory[key]
  })
  Object.assign(boardInventory, empty)
}

function serializeInventory() {
  const data = {}
  Object.keys(boardInventory).forEach((slug) => {
    data[slug] = (boardInventory[slug] || []).map((item) => ({ ...item }))
  })
  return data
}

function persistBoardInventory() {
  try {
    const key = storageKey(currentStorageUserId)
    localStorage.setItem(key, JSON.stringify(serializeInventory()))
  } catch {
    // ignore quota errors
  }
}

function splitChannelBrand(channel, brand = '') {
  const existingBrand = String(brand || '').trim()
  const rawChannel = String(channel || '').trim()
  if (existingBrand) {
    return { channel: rawChannel, brand: existingBrand }
  }
  const dashIdx = rawChannel.indexOf('-')
  if (dashIdx === -1) {
    return { channel: rawChannel, brand: '' }
  }
  return {
    channel: rawChannel.slice(0, dashIdx).trim(),
    brand: rawChannel.slice(dashIdx + 1).trim(),
  }
}

function normalizeBoardItem(slug, item, existing = {}) {
  const { channel, brand } = splitChannelBrand(
    item.channel ?? existing.channel,
    item.brand ?? existing.brand,
  )
  return {
    id: existing.id ?? boardIdSeq++,
    name: String(item.name || '').trim(),
    size: item.size || fromBoardSlug(slug),
    image: item.image !== undefined ? String(item.image || '').trim() : String(existing.image || '').trim(),
    channel,
    brand,
    price: item.price === '' || item.price == null ? '' : Number(item.price),
    note: (item.note || '').trim(),
    status: item.status || '在用',
    defectStatus: item.defectStatus || '无暇',
    stock: normalizeToolStock(item.stock ?? existing.stock ?? 1),
    purchaseDate: (item.purchaseDate || '').trim(),
    basePlate: (item.basePlate || '').trim(),
  }
}

function applySavedInventory(saved) {
  if (!saved || typeof saved !== 'object') return

  let maxId = 0
  let needsPersist = false
  Object.entries(saved).forEach(([slug, list]) => {
    if (!Array.isArray(list)) return
    if (!boardInventory[slug]) boardInventory[slug] = []
    list.forEach((item) => {
      const hadCombinedChannel = !String(item.brand || '').trim() && String(item.channel || '').includes('-')
      const normalized = normalizeBoardItem(slug, item, item)
      if (hadCombinedChannel) needsPersist = true
      if (normalized.id > maxId) maxId = normalized.id
      boardInventory[slug].push(normalized)
    })
  })
  boardIdSeq = maxId + 1
  if (needsPersist) persistBoardInventory()
}

function loadBoardInventoryFromStorage(userId) {
  try {
    const userKey = storageKey(userId)
    let raw = localStorage.getItem(userKey)
    if (!raw && userId) {
      raw = localStorage.getItem(LEGACY_BOARD_STORAGE_KEY)
    }
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** 登录或切换账号时加载本地豆板数据 */
export function initBoardInventory(userId) {
  currentStorageUserId = userId ?? null
  resetBoardInventory()
  applySavedInventory(loadBoardInventoryFromStorage(userId))
}

export const addBoardItem = (slug, item) => {
  if (!boardInventory[slug]) boardInventory[slug] = []
  const created = normalizeBoardItem(slug, item)
  boardInventory[slug].push(created)
  persistBoardInventory()
  return created
}

export const updateBoardItem = (slug, id, item, originalSlug) => {
  const fromSlug = originalSlug || slug
  const list = boardInventory[fromSlug]
  if (!list) return null

  const index = list.findIndex((row) => row.id === id)
  if (index === -1) return null

  const updated = normalizeBoardItem(slug, item, list[index])

  if (fromSlug !== slug) {
    list.splice(index, 1)
    if (!boardInventory[slug]) boardInventory[slug] = []
    boardInventory[slug].push(updated)
  } else {
    list[index] = updated
  }

  persistBoardInventory()
  return updated
}

export const deleteBoardItem = (slug, id) => {
  const list = boardInventory[slug]
  if (!list) return false
  const index = list.findIndex((row) => row.id === id)
  if (index === -1) return false
  list.splice(index, 1)
  persistBoardInventory()
  return true
}

export const deleteBoardItems = (entries) => {
  entries.forEach(({ slug, id }) => deleteBoardItem(slug, id))
}

export const updateBoardItemsStatus = (entries, status) => {
  let updated = 0
  entries.forEach(({ slug, id }) => {
    const list = boardInventory[slug]
    if (!list) return
    const index = list.findIndex((row) => row.id === id)
    if (index === -1) return
    list[index] = { ...list[index], status }
    updated += 1
  })
  if (updated > 0) persistBoardInventory()
  return updated
}

const countBoardActive = (slug) =>
  (boardInventory[slug] || [])
    .filter(isBoardInUse)
    .reduce((sum, item) => sum + normalizeToolStock(item.stock), 0)

export const getBoardActiveCount = (slug) => {
  if (slug === BOARD_ALL_SLUG) {
    return BOARD_SIZES.reduce((sum, size) => sum + countBoardActive(toBoardSlug(size)), 0)
  }
  return countBoardActive(slug)
}

export const getBoardStock = (slug) => getBoardActiveCount(slug)

export const getBoardList = (slug) => {
  if (slug === BOARD_ALL_SLUG) {
    return BOARD_SIZES.flatMap((size) => {
      const key = toBoardSlug(size)
      return (boardInventory[key] || []).map((item) => ({
        ...item,
        size: item.size || size,
        sizeSlug: key,
      }))
    })
  }
  return (boardInventory[slug] || []).map((item) => ({
    ...item,
    sizeSlug: slug,
  }))
}

export const getBoardRowKey = (item) => `${item.sizeSlug}-${item.id}`

export const TOOL_CATEGORY_KEYS = ['pen', 'scoop', 'other']

export const TOOL_CATEGORIES = {
  pen: { key: 'pen', name: '拼豆笔', icon: '✎' },
  scoop: { key: 'scoop', name: '拼豆铲', icon: '◨' },
  other: { key: 'other', name: '其他', icon: '◪' },
}

export const PEN_MATERIAL_OPTIONS = [
  { value: '钢针', label: '钢针' },
  { value: '陶瓷', label: '陶瓷' },
  { value: '钨钢', label: '钨钢' },
]

export const PEN_STYLE_OPTIONS = [
  { value: '单针', label: '单针' },
  { value: '双针', label: '双针' },
  { value: '豆仓', label: '豆仓' },
]

const TOOL_STORAGE_PREFIX = 'pindou-admin-tool-inventory'
const LEGACY_TOOL_STORAGE_KEY = 'pindou-admin-tool-inventory'

const DEFAULT_TOOL_SEED = {
  pen: [],
  scoop: [],
  other: [],
}

export const toolInventory = reactive({
  pen: [],
  scoop: [],
  other: [],
})

let toolIdSeq = 1
let currentToolStorageUserId = null

function toolStorageKey(userId) {
  return userId ? `${TOOL_STORAGE_PREFIX}-${userId}` : LEGACY_TOOL_STORAGE_KEY
}

function resetToolInventory() {
  TOOL_CATEGORY_KEYS.forEach((key) => {
    toolInventory[key] = []
  })
}

function normalizeToolStock(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 1) return 1
  return Math.floor(num)
}

function normalizeOtherToolItem(item, existing = {}) {
  return {
    id: existing.id ?? toolIdSeq++,
    name: String(item.name || '').trim(),
    category: String(
      item.category ?? item.toolType ?? existing.category ?? existing.toolType ?? '',
    ).trim(),
    spec: String(item.spec || '').trim(),
    stock: normalizeToolStock(item.stock ?? existing.stock ?? 1),
    channel: String(item.channel || '').trim(),
    purchaseDate: String(item.purchaseDate || '').trim(),
    price: item.price === '' || item.price == null ? '' : Number(item.price),
    status: item.status || existing.status || '在用',
    note: String(item.note || '').trim(),
  }
}

function normalizePenToolItem(item, existing = {}) {
  const { channel, brand } = splitChannelBrand(
    item.channel ?? existing.channel,
    item.brand ?? existing.brand,
  )
  return {
    id: existing.id ?? toolIdSeq++,
    name: String(item.name || '').trim(),
    image: item.image !== undefined ? String(item.image || '').trim() : String(existing.image || '').trim(),
    material: String(item.material ?? existing.material ?? '').trim(),
    style: String(item.style ?? existing.style ?? '').trim(),
    spec: String(item.spec || '').trim(),
    channel,
    brand,
    purchaseDate: String(item.purchaseDate || '').trim(),
    price: item.price === '' || item.price == null ? '' : Number(item.price),
    status: item.status || existing.status || '在用',
    note: String(item.note || '').trim(),
  }
}

function normalizeScoopToolItem(item, existing = {}) {
  return {
    id: existing.id ?? toolIdSeq++,
    name: String(item.name || '').trim(),
    image: item.image !== undefined ? String(item.image || '').trim() : String(existing.image || '').trim(),
    spec: String(item.spec || '').trim(),
    colorStyle: String(item.colorStyle ?? existing.colorStyle ?? '').trim(),
    channel: String(item.channel || '').trim(),
    purchaseDate: String(item.purchaseDate || '').trim(),
    price: item.price === '' || item.price == null ? '' : Number(item.price),
    status: item.status || existing.status || '在用',
    note: String(item.note || '').trim(),
  }
}

function normalizeToolItem(categoryKey, item, existing = {}) {
  if (categoryKey === 'pen') {
    return normalizePenToolItem(item, existing)
  }
  if (categoryKey === 'scoop') {
    return normalizeScoopToolItem(item, existing)
  }
  if (categoryKey === 'other') {
    return normalizeOtherToolItem(item, existing)
  }
  return normalizeOtherToolItem(item, existing)
}

/** 仅「在用」计入拼豆笔、拼豆铲库存 */
export const isToolInUse = (item) => (item?.status || '在用') === '在用'

function seedDefaultToolInventory() {
  TOOL_CATEGORY_KEYS.forEach((key) => {
    DEFAULT_TOOL_SEED[key].forEach((item) => {
      toolInventory[key].push(normalizeToolItem(key, item))
    })
  })
}

function serializeToolInventory() {
  const data = {}
  TOOL_CATEGORY_KEYS.forEach((key) => {
    data[key] = (toolInventory[key] || []).map((item) => ({ ...item }))
  })
  return data
}

function persistToolInventory() {
  try {
    const key = toolStorageKey(currentToolStorageUserId)
    localStorage.setItem(key, JSON.stringify(serializeToolInventory()))
  } catch {
    // ignore quota errors
  }
}

function normalizeSavedToolInventory(saved) {
  if (!saved || typeof saved !== 'object') return saved
  const next = { ...saved }
  if (Array.isArray(next.storage) && !next.other) {
    next.other = next.storage
    delete next.storage
  }
  return next
}

function applySavedToolInventory(saved) {
  const normalizedSaved = normalizeSavedToolInventory(saved)
  if (!normalizedSaved || typeof normalizedSaved !== 'object') return false

  let maxId = 0
  let hasData = false
  let needsPersist = false

  TOOL_CATEGORY_KEYS.forEach((key) => {
    const list = normalizedSaved[key]
    if (!Array.isArray(list) || !list.length) return
    hasData = true
    list.forEach((item) => {
      const hadCombinedChannel = key === 'pen'
        && !String(item.brand || '').trim()
        && String(item.channel || '').includes('-')
      const normalized = normalizeToolItem(key, item, item)
      if (hadCombinedChannel) needsPersist = true
      if (normalized.id > maxId) maxId = normalized.id
      toolInventory[key].push(normalized)
    })
  })

  toolIdSeq = maxId + 1
  if (needsPersist) persistToolInventory()
  return hasData
}

function loadToolInventoryFromStorage(userId) {
  try {
    const userKey = toolStorageKey(userId)
    let raw = localStorage.getItem(userKey)
    if (!raw && userId) {
      raw = localStorage.getItem(LEGACY_TOOL_STORAGE_KEY)
    }
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function initToolInventory(userId) {
  currentToolStorageUserId = userId ?? null
  resetToolInventory()
  const saved = loadToolInventoryFromStorage(userId)
  const loaded = applySavedToolInventory(saved)
  if (!loaded) {
    seedDefaultToolInventory()
    persistToolInventory()
  }
}

export const addToolItem = (categoryKey, item) => {
  if (!toolInventory[categoryKey]) toolInventory[categoryKey] = []
  const created = normalizeToolItem(categoryKey, item)
  toolInventory[categoryKey].push(created)
  persistToolInventory()
  return created
}

export const updateToolItem = (categoryKey, id, item) => {
  const list = toolInventory[categoryKey]
  if (!list) return null

  const index = list.findIndex((row) => row.id === id)
  if (index === -1) return null

  const updated = normalizeToolItem(categoryKey, item, list[index])
  list[index] = updated
  persistToolInventory()
  return updated
}

export const deleteToolItem = (categoryKey, id) => {
  const list = toolInventory[categoryKey]
  if (!list) return false
  const index = list.findIndex((row) => row.id === id)
  if (index === -1) return false
  list.splice(index, 1)
  persistToolInventory()
  return true
}

export const deleteToolItems = (categoryKey, ids) => {
  ids.forEach((id) => deleteToolItem(categoryKey, id))
}

export const getToolList = (categoryKey) => toolInventory[categoryKey] || []

export const getToolStock = (categoryKey) => {
  const list = getToolList(categoryKey)
  if (categoryKey === 'pen' || categoryKey === 'scoop') {
    return list.filter(isToolInUse).length
  }
  if (categoryKey === 'other') {
    return list
      .filter(isToolInUse)
      .reduce((sum, item) => sum + normalizeToolStock(item.stock), 0)
  }
  return list.reduce((sum, item) => sum + normalizeToolStock(item.stock), 0)
}

export const getPenList = () => getToolList('pen')

export const getPenActiveCount = () => getToolStock('pen')

export const getPenRowKey = (item) => `pen-${item.id}`

export const getScoopList = () => getToolList('scoop')

export const getScoopActiveCount = () => getToolStock('scoop')

export const getScoopRowKey = (item) => `scoop-${item.id}`

export const getOtherList = () => getToolList('other')

export const getOtherCategoryOptions = () => {
  const set = new Set()
  getOtherList().forEach((item) => {
    const category = String(item.category || item.toolType || '').trim()
    if (category) set.add(category)
  })
  return [...set]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((value) => ({ value, label: value }))
}

export const getOtherStock = () => getToolStock('other')

export const getTotalToolStock = () =>
  getBoardStock(BOARD_ALL_SLUG) +
  getToolStock('pen') +
  getToolStock('scoop') +
  getToolStock('other')

export const getOtherRowKey = (item) => `other-${item.id}`

export function buildBoardSizeChartData() {
  return BOARD_SIZES.map((size) => ({
    name: size,
    value: getBoardStock(toBoardSlug(size)),
  })).filter((item) => item.value > 0)
}

export function buildPenStatKey(item) {
  const material = String(item?.material || '').trim()
  const spec = String(item?.spec || '').trim()
  const parts = [material, spec].filter(Boolean)
  return parts.length ? parts.join('') : '未分类'
}

export function buildPenChartData() {
  const map = new Map()
  getPenList()
    .filter(isToolInUse)
    .forEach((item) => {
      const key = buildPenStatKey(item)
      if (!map.has(key)) {
        map.set(key, {
          spec: String(item.spec || '').trim() || '—',
          material: String(item.material || '').trim(),
          value: 0,
        })
      }
      map.get(key).value += 1
    })
  return [...map.values()].sort((a, b) => b.value - a.value)
}

/** @deprecated 使用 buildPenChartData */
export function buildPenSpecChartData() {
  return buildPenChartData()
}

export function buildScoopChartData() {
  const map = new Map()
  getScoopList()
    .filter(isToolInUse)
    .forEach((item) => {
      const spec = String(item.spec || '').trim() || '未填'
      map.set(spec, (map.get(spec) || 0) + 1)
    })
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function buildOtherChartData() {
  const map = new Map()
  getOtherList()
    .filter(isToolInUse)
    .forEach((item) => {
      const category = String(item.category || '').trim() || '未填'
      map.set(category, (map.get(category) || 0) + normalizeToolStock(item.stock))
    })
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function buildSimpleToolNameChartData(categoryKey) {
  const list = getToolList(categoryKey)
  return list
    .map((item) => ({
      name: item.name,
      value: normalizeToolStock(item.stock),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function sumItemPrices(items) {
  return (items || []).reduce((sum, item) => {
    const price = Number(item?.price)
    if (!Number.isFinite(price) || price <= 0) return sum
    return Math.round((sum + price) * 100) / 100
  }, 0)
}

export function formatToolTotalAmount(value) {
  const num = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(num) || num <= 0) return '¥0'
  return num % 1 === 0 ? `¥${num}` : `¥${num.toFixed(2)}`
}

// 首次进入应用时按当前登录用户加载
try {
  const rawUser = localStorage.getItem('pindou-admin-user')
  const user = rawUser ? JSON.parse(rawUser) : null
  initBoardInventory(user?.id ?? null)
  initToolInventory(user?.id ?? null)
} catch {
  initBoardInventory(null)
  initToolInventory(null)
}
