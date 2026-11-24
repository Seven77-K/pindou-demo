import { computed, ref, watch } from 'vue'
import {
  BOARD_ALL_SLUG,
  boardInventory,
  deleteBoardItem,
  getBoardList,
  getPenList,
  getOtherList,
  getScoopList,
  toolInventory,
  updateBoardItem,
  updateToolItem,
} from '@/view/tools/constants'
import { updatePattern, usePatternData } from '@/composables/usePatternData'
import { useAuth } from '@/composables/useAuth'
import { getCostPatternBuyerName } from '@/config/permissions'
import { useAuthorAmounts } from '@/composables/useAuthorAmounts'
import { normalizeBeadColorCode, BEAD_COLOR_CODE_SET } from '@/constants/beadColors221'

const DEFAULT_CATEGORIES = ['拼豆', '工具会员', '材料', '工具', '耗材', '其他']

/** 花费统计主图单独展示的类别，其余归入「其他」 */
export const COST_CHART_PRIMARY_CATEGORIES = [
  '拼豆',
  '工具会员',
  '拼豆板',
  '拼豆笔',
  '拼豆铲',
  '普通图纸',
  '会员图纸',
]

export const COST_OTHER_GROUP = '其他'

export const MANUAL_BEAD_SPEC_OPTIONS = ['221全色', '补充装']

export const MANUAL_EXPENSE_CATEGORY_OPTIONS = ['拼豆', '工具会员']

export function isBeadExpenseCategory(category) {
  return String(category || '').trim() === '拼豆'
}

function requiresManualSpec(category) {
  return isBeadExpenseCategory(category)
}

function manualExpensesKey(userId) {
  return `pindou-admin-manual-expenses-${userId || 'guest'}`
}

function loadManualExpensesFromStorage(userId) {
  try {
    const raw = localStorage.getItem(manualExpensesKey(userId))
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .map((item, index) => normalizeManualRow(item, index))
      .filter((item) => item.amount > 0)
  } catch {
    return []
  }
}

function normalizeRefillItems(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const rows = []
  list.forEach((item) => {
    const code = normalizeBeadColorCode(item?.code ?? item)
    if (!code || seen.has(code) || !BEAD_COLOR_CODE_SET.has(code)) return
    seen.add(code)
    rows.push({
      code,
      weight: String(item?.weight ?? '').trim(),
    })
  })
  return rows
}

export function formatRefillNote(items) {
  const rows = normalizeRefillItems(items)
  if (!rows.length) return ''

  const byWeight = new Map()
  rows.forEach((row) => {
    const weight = String(row.weight || '').trim()
    if (!byWeight.has(weight)) byWeight.set(weight, [])
    byWeight.get(weight).push(row.code)
  })

  const parts = []
  byWeight.forEach((codes, weight) => {
    if (!weight) {
      parts.push(codes.join('、'))
      return
    }
    if (codes.length === 1) {
      parts.push(`${codes[0]} ${weight}`)
      return
    }
    const joined = codes.length === 2 ? codes.join('和') : codes.join('、')
    parts.push(`${joined}各${weight}`)
  })
  return parts.join('、')
}

/** 一斤=500g，半斤=250g；兼容旧备注自由文本 */
function chineseCountToNumber(raw) {
  const text = String(raw || '').trim()
  if (!text) return 1
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text)
  const map = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }
  if (map[text] != null) return map[text]
  return 1
}

function normalizeWeightPhrase(raw) {
  const text = String(raw || '').replace(/\s+/g, '')
  if (!text) return ''
  if (text.includes('半斤')) return '250g'
  const jinMatch = text.match(/^([一二两三四五六七八九十\d.]*)斤$/)
  if (jinMatch) {
    const count = chineseCountToNumber(jinMatch[1])
    return `${Math.round(count * 500)}g`
  }
  const gramMatch = text.match(/^(\d+(?:\.\d+)?)g$/i)
  if (gramMatch) return `${gramMatch[1]}g`
  return ''
}

const REFILL_WEIGHT_TOKEN = String.raw`半斤|(?:[一二两三四五六七八九十\d.]+\s*)?斤|\d+(?:\.\d+)?\s*g`
const REFILL_CODE_TOKEN = String.raw`[A-HM]\d{1,2}`

function extractValidCodes(text) {
  const codes = []
  const seen = new Set()
  String(text || '').replace(new RegExp(REFILL_CODE_TOKEN, 'gi'), (raw) => {
    const code = normalizeBeadColorCode(raw)
    if (!code || !BEAD_COLOR_CODE_SET.has(code) || seen.has(code)) return raw
    seen.add(code)
    codes.push(code)
    return raw
  })
  return codes
}

/** 从历史备注解析补充装色号+重量，如「一斤H6」「E16 半斤」「H2和D22各100g」 */
export function parseRefillNoteToItems(note) {
  const text = String(note || '').trim()
  if (!text) return []

  const shared = text.match(new RegExp(`各\\s*(${REFILL_WEIGHT_TOKEN})`, 'i'))
  if (shared) {
    const weight = normalizeWeightPhrase(shared[1])
    return extractValidCodes(text).map((code) => ({ code, weight }))
  }

  const pairs = new Map()
  const pushPair = (codeRaw, weightRaw) => {
    const code = normalizeBeadColorCode(codeRaw)
    if (!code || !BEAD_COLOR_CODE_SET.has(code) || pairs.has(code)) return
    pairs.set(code, { code, weight: normalizeWeightPhrase(weightRaw) })
  }

  const weightThenCode = new RegExp(`(${REFILL_WEIGHT_TOKEN})\\s*(${REFILL_CODE_TOKEN})`, 'gi')
  let match
  while ((match = weightThenCode.exec(text)) !== null) {
    pushPair(match[2], match[1])
  }

  const codeThenWeight = new RegExp(`(${REFILL_CODE_TOKEN})\\s*(${REFILL_WEIGHT_TOKEN})`, 'gi')
  while ((match = codeThenWeight.exec(text)) !== null) {
    pushPair(match[1], match[2])
  }

  // 仅有色号、无重量时也带上，方便点开编辑补重量
  if (!pairs.size) {
    return extractValidCodes(text).map((code) => ({ code, weight: '' }))
  }

  return [...pairs.values()]
}

function resolveRefillItems(item) {
  const fromStore = normalizeRefillItems(item?.refillItems)
  if (fromStore.length) return fromStore
  if (String(item?.spec || '').trim() !== '补充装') return []
  return parseRefillNoteToItems(item?.note)
}

function normalizeManualRow(item, index = 0) {
  const spec = String(item.spec || '').trim()
  const refillItems = spec === '补充装' ? resolveRefillItems({ ...item, spec }) : []
  // 优先保留手动备注；无备注时再用色号表格生成
  const note = String(item.note || '').trim() || formatRefillNote(refillItems)
  return {
    id: item.id || `manual-${index}`,
    date: normalizeDate(item.date),
    category: String(item.category || '拼豆').trim() || '拼豆',
    spec,
    brand: String(item.brand || '').trim(),
    channel: String(item.channel || '').trim(),
    amount: normalizeAmount(item.amount),
    note,
    refillItems,
    source: 'manual',
  }
}

function normalizeAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.round(num * 100) / 100
}

function normalizeDate(value) {
  return String(value || '').trim().slice(0, 10)
}

export function getCostBuyerName(user) {
  return getCostPatternBuyerName(user)
}

function isSameMonth(dateStr, refDate = new Date()) {
  const date = normalizeDate(dateStr)
  if (!date) return false
  const month = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`
  return date.startsWith(month)
}

function isSameLastMonth(dateStr, refDate = new Date()) {
  const date = normalizeDate(dateStr)
  if (!date) return false
  const lastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1)
  const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  return date.startsWith(month)
}

function isSameYear(dateStr, refDate = new Date()) {
  const date = normalizeDate(dateStr)
  if (!date) return false
  return date.startsWith(String(refDate.getFullYear()))
}

function sumByFilter(rows, filterFn) {
  return rows.reduce((sum, row) => (filterFn(row) ? sum + row.amount : sum), 0)
}

function findBoardItem(sizeSlug, boardId) {
  return (boardInventory[sizeSlug] || []).find((item) => item.id === boardId) || null
}

function findPenItem(penId) {
  return getPenList().find((item) => item.id === penId) || null
}

function findScoopItem(scoopId) {
  return getScoopList().find((item) => item.id === scoopId) || null
}

function findOtherItem(otherId) {
  return getOtherList().find((item) => item.id === otherId) || null
}

export function useCostData() {
  const { user } = useAuth()
  const { normalPatterns } = usePatternData()
  const { listExpenseRows: listAuthorExpenseRows, removeAmount: removeAuthorAmount } = useAuthorAmounts()
  const manualExpenses = ref([])

  const buyerFilter = computed(() => getCostBuyerName(user.value))

  const persistManualExpenses = () => {
    if (!user.value?.id) return
    localStorage.setItem(manualExpensesKey(user.value.id), JSON.stringify(manualExpenses.value))
  }

  watch(
    () => user.value?.id,
    (userId) => {
      manualExpenses.value = loadManualExpensesFromStorage(userId)
      // 把从旧备注解析出的色号写回本地，方便下次直接用表格
      if (userId && manualExpenses.value.some((row) => row.refillItems?.length)) {
        persistManualExpenses()
      }
    },
    { immediate: true },
  )

  const linkedExpenses = computed(() => {
    void boardInventory
    void toolInventory

    const rows = []
    const myBuyer = buyerFilter.value

    getBoardList(BOARD_ALL_SLUG).forEach((item) => {
      const amount = normalizeAmount(item.price)
      if (amount <= 0) return
      rows.push({
        id: `board-${item.sizeSlug}-${item.id}`,
        date: normalizeDate(item.purchaseDate),
        category: '拼豆板',
        spec: item.size || '',
        brand: item.brand || '',
        channel: item.channel || '',
        amount,
        note: [item.name, item.status || '在用'].filter(Boolean).join(' · ') || '—',
        source: 'tool',
        sizeSlug: item.sizeSlug,
        refId: item.id,
      })
    })

    getPenList().forEach((item) => {
      const amount = normalizeAmount(item.price)
      if (amount <= 0) return
      rows.push({
        id: `pen-${item.id}`,
        date: normalizeDate(item.purchaseDate),
        category: '拼豆笔',
        spec: [item.material, item.style, item.spec].filter(Boolean).join('') || '',
        brand: item.brand || '',
        channel: item.channel || '',
        amount,
        note: [item.name, item.status || '在用'].filter(Boolean).join(' · ') || '—',
        source: 'pen',
        refId: item.id,
      })
    })

    getScoopList().forEach((item) => {
      const amount = normalizeAmount(item.price)
      if (amount <= 0) return
      rows.push({
        id: `scoop-${item.id}`,
        date: normalizeDate(item.purchaseDate),
        category: '拼豆铲',
        spec: [item.spec, item.colorStyle].filter(Boolean).join(' · ') || '',
        brand: item.name || '',
        channel: item.channel || '',
        amount,
        note: item.note || item.status || '—',
        source: 'scoop',
        refId: item.id,
      })
    })

    getOtherList().forEach((item) => {
      const amount = normalizeAmount(item.price)
      if (amount <= 0) return
      rows.push({
        id: `other-${item.id}`,
        date: normalizeDate(item.purchaseDate),
        category: String(item.category || '').trim() || '其他',
        spec: String(item.spec || '').trim(),
        channel: item.channel || '',
        amount,
        note: [item.name, item.status || '在用'].filter(Boolean).join(' · ') || '—',
        source: 'other',
        refId: item.id,
      })
    })

    normalPatterns.value.forEach((item) => {
      const amount = normalizeAmount(item.price)
      if (amount <= 0) return

      if (!myBuyer) return

      const buyer = String(item.buyer || '').trim()
      if (buyer !== myBuyer) return

      rows.push({
        id: `pattern-${item.id}`,
        date: normalizeDate(item.date),
        category: '普通图纸',
        spec: item.size || '',
        channel: item.buyer || '',
        amount,
        note: item.name || '—',
        source: 'pattern',
        refId: item.id,
      })
    })

    manualExpenses.value.forEach((item) => {
      rows.push({ ...item })
    })

    if (myBuyer) {
      listAuthorExpenseRows(myBuyer).forEach((item) => {
        rows.push({
          id: `author-${item.key}`,
          date: item.date,
          category: '会员图纸',
          spec: '',
          channel: item.buyer || '',
          amount: item.amount,
          note: item.author,
          source: 'author',
          refKey: item.key,
        })
      })
    }

    return rows.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '')
      if (dateCmp !== 0) return dateCmp
      return String(b.id).localeCompare(String(a.id))
    })
  })

  const categoryOptions = computed(() => {
    const set = new Set(DEFAULT_CATEGORIES)
    linkedExpenses.value.forEach((row) => {
      if (row.category) set.add(row.category)
    })
    return [...set]
  })

  const monthTotal = computed(() =>
    sumByFilter(linkedExpenses.value, (row) => isSameMonth(row.date)),
  )

  const yearTotal = computed(() =>
    sumByFilter(linkedExpenses.value, (row) => isSameYear(row.date)),
  )

  const allTotal = computed(() =>
    linkedExpenses.value.reduce((sum, row) => sum + row.amount, 0),
  )

  const getExpenseFormData = (row) => {
    if (row.source === 'manual') {
      return {
        date: row.date,
        category: row.category || '拼豆',
        spec: row.spec || '',
        brand: row.brand || '',
        channel: row.channel || '',
        amount: String(row.amount),
        note: row.note || '',
        refillItems: resolveRefillItems(row),
      }
    }

    if (row.source === 'tool') {
      const board = findBoardItem(row.sizeSlug, row.refId)
      return {
        date: normalizeDate(board?.purchaseDate || row.date),
        category: '拼豆板',
        amount: String(row.amount),
        note: board?.note || '',
        categoryLocked: true,
      }
    }

    if (row.source === 'pen') {
      const pen = findPenItem(row.refId)
      return {
        date: normalizeDate(pen?.purchaseDate || row.date),
        category: '拼豆笔',
        amount: String(row.amount),
        note: pen?.note || '',
        categoryLocked: true,
      }
    }

    if (row.source === 'scoop') {
      const scoop = findScoopItem(row.refId)
      return {
        date: normalizeDate(scoop?.purchaseDate || row.date),
        category: '拼豆铲',
        amount: String(row.amount),
        note: scoop?.note || '',
        categoryLocked: true,
      }
    }

    if (row.source === 'other') {
      const other = findOtherItem(row.refId)
      return {
        date: normalizeDate(other?.purchaseDate || row.date),
        category: String(other?.category || row.category || '').trim() || '其他',
        amount: String(row.amount),
        note: other?.note || '',
        categoryLocked: true,
      }
    }

    const pattern = normalPatterns.value.find((item) => item.id === row.refId)
    return {
      date: normalizeDate(pattern?.date || row.date),
      category: '普通图纸',
      amount: String(row.amount),
      note: pattern?.name || row.note || '',
      categoryLocked: true,
    }
  }

  const addManualExpense = (payload) => {
    const category = String(payload.category || '拼豆').trim() || '拼豆'
    const row = normalizeManualRow({
      id: `manual-${Date.now()}`,
      date: payload.date,
      category,
      spec: requiresManualSpec(category) ? payload.spec : '',
      brand: payload.brand,
      channel: payload.channel,
      amount: payload.amount,
      note: payload.note,
      refillItems: payload.refillItems,
    })
    if (!row.date) throw new Error('请选择日期')
    if (requiresManualSpec(row.category) && !row.spec) throw new Error('请选择规格')
    if (row.amount <= 0) throw new Error('请填写有效金额')
    manualExpenses.value = [row, ...manualExpenses.value]
    persistManualExpenses()
    return row
  }

  const updateManualExpense = (id, payload) => {
    const index = manualExpenses.value.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('记录不存在')

    const category = String(payload.category || manualExpenses.value[index].category || '拼豆').trim() || '拼豆'
    const row = normalizeManualRow({
      ...manualExpenses.value[index],
      date: payload.date,
      category,
      spec: requiresManualSpec(category) ? payload.spec : '',
      brand: payload.brand,
      channel: payload.channel,
      amount: payload.amount,
      note: payload.note,
      refillItems: payload.refillItems,
    })
    if (!row.date) throw new Error('请选择日期')
    if (requiresManualSpec(row.category) && !row.spec) throw new Error('请选择规格')
    if (row.amount <= 0) throw new Error('请填写有效金额')

    manualExpenses.value[index] = row
    persistManualExpenses()
    return row
  }

  const updateExpense = async (row, payload) => {
    const date = normalizeDate(payload.date)
    const amount = normalizeAmount(payload.amount)
    const note = String(payload.note || '').trim()
    const category = String(payload.category || '').trim()

    if (!date) throw new Error('请选择日期')
    if (amount <= 0) throw new Error('请填写有效金额')

    if (row.source === 'manual') {
      updateManualExpense(row.id, {
        date,
        category: String(payload.category || row.category || '拼豆').trim() || '拼豆',
        spec: String(payload.spec || '').trim(),
        brand: String(payload.brand || '').trim(),
        channel: String(payload.channel || '').trim(),
        amount,
        note,
        refillItems: payload.refillItems,
      })
      return
    }

    if (row.source === 'tool') {
      const board = findBoardItem(row.sizeSlug, row.refId)
      if (!board) throw new Error('豆板不存在')
      updateBoardItem(
        row.sizeSlug,
        row.refId,
        {
          ...board,
          purchaseDate: date,
          price: amount,
          note,
        },
        row.sizeSlug,
      )
      return
    }

    if (row.source === 'pen') {
      const pen = findPenItem(row.refId)
      if (!pen) throw new Error('拼豆笔不存在')
      updateToolItem('pen', row.refId, {
        ...pen,
        purchaseDate: date,
        price: amount,
        note,
      })
      return
    }

    if (row.source === 'scoop') {
      const scoop = findScoopItem(row.refId)
      if (!scoop) throw new Error('拼豆铲不存在')
      updateToolItem('scoop', row.refId, {
        ...scoop,
        purchaseDate: date,
        price: amount,
        note,
      })
      return
    }

    if (row.source === 'other') {
      const other = findOtherItem(row.refId)
      if (!other) throw new Error('其他工具不存在')
      updateToolItem('other', row.refId, {
        ...other,
        purchaseDate: date,
        price: amount,
        note,
      })
      return
    }

    if (row.source === 'pattern') {
      const pattern = normalPatterns.value.find((item) => item.id === row.refId)
      if (!pattern) throw new Error('图纸不存在')
      await updatePattern(row.refId, 'normal', {
        date,
        price: amount,
        name: note || pattern.name,
      })
      return
    }

    if (row.source === 'author') {
      throw new Error('会员金额请在图纸作者页编辑')
    }
  }

  const removeExpense = async (row) => {
    if (row.source === 'manual') {
      manualExpenses.value = manualExpenses.value.filter((item) => item.id !== row.id)
      persistManualExpenses()
      return
    }

    if (row.source === 'tool') {
      const ok = deleteBoardItem(row.sizeSlug, row.refId)
      if (!ok) throw new Error('豆板不存在')
      return
    }

    if (row.source === 'pen') {
      const pen = findPenItem(row.refId)
      if (!pen) throw new Error('拼豆笔不存在')
      updateToolItem('pen', row.refId, { ...pen, price: null })
      return
    }

    if (row.source === 'scoop') {
      const scoop = findScoopItem(row.refId)
      if (!scoop) throw new Error('拼豆铲不存在')
      updateToolItem('scoop', row.refId, { ...scoop, price: null })
      return
    }

    if (row.source === 'other') {
      const other = findOtherItem(row.refId)
      if (!other) throw new Error('其他工具不存在')
      updateToolItem('other', row.refId, { ...other, price: null })
      return
    }

    if (row.source === 'pattern') {
      const pattern = normalPatterns.value.find((item) => item.id === row.refId)
      if (!pattern) throw new Error('图纸不存在')
      await updatePattern(row.refId, 'normal', { price: null })
      return
    }

    if (row.source === 'author') {
      await removeAuthorAmount(row.refKey)
      return
    }
  }

  return {
    linkedExpenses,
    categoryOptions,
    monthTotal,
    yearTotal,
    allTotal,
    buyerFilter,
    getExpenseFormData,
    addManualExpense,
    updateExpense,
    removeExpense,
  }
}

export function sumExpenseTotals(rows) {
  return {
    month: sumByFilter(rows, (row) => isSameMonth(row.date)),
    year: sumByFilter(rows, (row) => isSameYear(row.date)),
    all: rows.reduce((sum, row) => sum + row.amount, 0),
  }
}

export function formatCostAmount(value) {
  const num = normalizeAmount(value)
  return `¥${num.toFixed(2)}`
}

export function displayCostChartCategory(category) {
  return category === '会员图纸' ? '会员' : category
}

export function buildCostCategoryAmounts(rows, scope = 'all', { groupOther = false } = {}) {
  const map = new Map()
  rows.forEach((row) => {
    if (scope === 'month' && !isSameMonth(row.date)) return
    if (scope === 'lastMonth' && !isSameLastMonth(row.date)) return
    if (scope === 'year' && !isSameYear(row.date)) return
    const rawCategory = String(row.category || '').trim() || COST_OTHER_GROUP
    const category = groupOther
      ? (COST_CHART_PRIMARY_CATEGORIES.includes(rawCategory) ? rawCategory : COST_OTHER_GROUP)
      : rawCategory
    map.set(category, (map.get(category) || 0) + row.amount)
  })
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount: normalizeAmount(amount) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

function buildCostOtherBreakdownAmounts(rows, scope = 'all') {
  const map = new Map()
  rows.forEach((row) => {
    if (scope === 'month' && !isSameMonth(row.date)) return
    if (scope === 'lastMonth' && !isSameLastMonth(row.date)) return
    if (scope === 'year' && !isSameYear(row.date)) return
    const rawCategory = String(row.category || '').trim() || COST_OTHER_GROUP
    if (COST_CHART_PRIMARY_CATEGORIES.includes(rawCategory)) return
    map.set(rawCategory, (map.get(rawCategory) || 0) + row.amount)
  })
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount: normalizeAmount(amount) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

function sortCostChartCategories(categories, totalItems) {
  return [...categories].sort((a, b) => {
    if (a === COST_OTHER_GROUP) return 1
    if (b === COST_OTHER_GROUP) return -1
    const totalA = totalItems.find((item) => item.name === a)?.amount || 0
    const totalB = totalItems.find((item) => item.name === b)?.amount || 0
    return totalB - totalA
  })
}

function mapAmountsByCategories(items, categories) {
  const map = Object.fromEntries(items.map((item) => [item.name, item.amount]))
  return categories.map((name) => map[name] || 0)
}

export function buildCostOtherBreakdownChartData(rows) {
  const monthItems = buildCostOtherBreakdownAmounts(rows, 'month')
  const lastMonthItems = buildCostOtherBreakdownAmounts(rows, 'lastMonth')
  const yearItems = buildCostOtherBreakdownAmounts(rows, 'year')
  const totalItems = buildCostOtherBreakdownAmounts(rows, 'all')
  const categorySet = new Set([
    ...monthItems.map((item) => item.name),
    ...lastMonthItems.map((item) => item.name),
    ...yearItems.map((item) => item.name),
    ...totalItems.map((item) => item.name),
  ])
  const categories = sortCostChartCategories([...categorySet], totalItems)
  return {
    categories,
    monthAmounts: mapAmountsByCategories(monthItems, categories),
    lastMonthAmounts: mapAmountsByCategories(lastMonthItems, categories),
    yearAmounts: mapAmountsByCategories(yearItems, categories),
    totalAmounts: mapAmountsByCategories(totalItems, categories),
  }
}

export function buildCostCategoryChartData(rows) {
  const monthItems = buildCostCategoryAmounts(rows, 'month', { groupOther: true })
  const lastMonthItems = buildCostCategoryAmounts(rows, 'lastMonth', { groupOther: true })
  const yearItems = buildCostCategoryAmounts(rows, 'year', { groupOther: true })
  const totalItems = buildCostCategoryAmounts(rows, 'all', { groupOther: true })
  const categorySet = new Set([
    ...monthItems.map((item) => item.name),
    ...lastMonthItems.map((item) => item.name),
    ...yearItems.map((item) => item.name),
    ...totalItems.map((item) => item.name),
  ])
  const categories = sortCostChartCategories([...categorySet], totalItems)
  const toMap = (items) => Object.fromEntries(items.map((item) => [item.name, item.amount]))
  const monthMap = toMap(monthItems)
  const lastMonthMap = toMap(lastMonthItems)
  const yearMap = toMap(yearItems)
  const totalMap = toMap(totalItems)
  return {
    categories,
    monthAmounts: categories.map((name) => monthMap[name] || 0),
    lastMonthAmounts: categories.map((name) => lastMonthMap[name] || 0),
    yearAmounts: categories.map((name) => yearMap[name] || 0),
    totalAmounts: categories.map((name) => totalMap[name] || 0),
    otherBreakdown: buildCostOtherBreakdownChartData(rows),
  }
}

/** 本年 1–12 月花费汇总，用于月度趋势柱状图 */
export function buildCostYearMonthlyChartData(rows, refDate = new Date()) {
  const year = refDate.getFullYear()
  const categories = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
  const amounts = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    return sumByFilter(rows, (row) => {
      const date = normalizeDate(row.date)
      return Boolean(date && date.startsWith(monthPrefix))
    })
  })
  return { categories, amounts, year }
}

/** 本月每日花费汇总，用于日度趋势折线图 */
export function buildCostMonthDailyChartData(rows, refDate = new Date()) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const categories = Array.from({ length: daysInMonth }, (_, index) => `${index + 1}日`)
  const amounts = Array.from({ length: daysInMonth }, (_, dayIndex) => {
    const day = `${monthPrefix}-${String(dayIndex + 1).padStart(2, '0')}`
    return sumByFilter(rows, (row) => {
      const date = normalizeDate(row.date)
      return Boolean(date && date === day)
    })
  })
  return { categories, amounts, year, month: month + 1 }
}

/** 指定日期（本月第几天，0-based）的花费明细列表 */
export function buildCostDayExpenseRows(rows, dayIndex, refDate = new Date()) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const day = dayIndex + 1
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dayRows = rows.filter((row) => normalizeDate(row.date) === date)
  return {
    year,
    month: month + 1,
    day,
    date,
    rows: dayRows,
    total: dayRows.reduce((sum, row) => sum + row.amount, 0),
  }
}

function matchesCostChartCategory(row, category) {
  const rawCategory = String(row.category || '').trim() || COST_OTHER_GROUP
  if (category === COST_OTHER_GROUP) {
    return !COST_CHART_PRIMARY_CATEGORIES.includes(rawCategory)
  }
  return rawCategory === category
}

/** 按图表类别 + 周期筛选花费明细（本月 / 本年 / 总计） */
export function buildCostCategoryExpenseRows(rows, category, scope = 'all') {
  const filtered = rows
    .filter((row) => {
      if (scope === 'month' && !isSameMonth(row.date)) return false
      if (scope === 'year' && !isSameYear(row.date)) return false
      return matchesCostChartCategory(row, category)
    })
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  return {
    category,
    scope,
    rows: filtered,
    total: filtered.reduce((sum, row) => sum + row.amount, 0),
  }
}

/** 指定月份（0–11）的类别花费明细 */
export function buildCostMonthCategoryChartData(rows, monthIndex, refDate = new Date()) {
  const year = refDate.getFullYear()
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const monthRows = rows.filter((row) => {
    const date = normalizeDate(row.date)
    return Boolean(date && date.startsWith(monthPrefix))
  })

  const monthItems = buildCostCategoryAmounts(monthRows, 'all', { groupOther: true })
  const categorySet = new Set(monthItems.map((item) => item.name))
  const categories = sortCostChartCategories([...categorySet], monthItems)
  const amountMap = Object.fromEntries(monthItems.map((item) => [item.name, item.amount]))

  return {
    year,
    monthIndex,
    monthLabel: `${monthIndex + 1}月`,
    categories,
    amounts: categories.map((name) => amountMap[name] || 0),
    total: monthRows.reduce((sum, row) => sum + row.amount, 0),
    otherBreakdown: buildCostOtherBreakdownChartData(monthRows),
  }
}
