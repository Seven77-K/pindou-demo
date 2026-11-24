import { computed, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  formatCostAmount,
  isBeadExpenseCategory,
  useCostData,
} from '@/composables/useCostData'
import { normalizeRepurchaseColors } from '@/constants/beadColors221'

const reviewsByUser = ref({})

function reviewsStorageKey(userId) {
  return `pindou-admin-brand-reviews-${userId}`
}

function loadReviewsFromStorage(userId) {
  if (!userId) return {}
  try {
    const raw = localStorage.getItem(reviewsStorageKey(userId))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** false=不回购；其余一律视为会回购（默认是） */
export function normalizeWillRepurchase(value) {
  if (value === false || value === 'no' || value === '否') return false
  return true
}

/** 花费规格 → 测评展示类别：221全色→全套，补充装→补充装 */
export function resolveBeadPackType(spec) {
  const text = String(spec || '').trim()
  if (!text) return ''
  if (text.includes('221') || text.includes('全色') || text.includes('全套')) return '全套'
  if (text.includes('补充')) return '补充装'
  return ''
}

/**
 * 从花费记录中汇总「拼豆」类目各品牌
 */
export function buildBeadBrandStats(expenses = []) {
  const map = new Map()

  expenses.forEach((row) => {
    if (!isBeadExpenseCategory(row.category)) return
    const brand = String(row.brand || '').trim()
    if (!brand) return

    if (!map.has(brand)) {
      map.set(brand, {
        brand,
        count: 0,
        amount: 0,
        lastDate: '',
        channels: new Set(),
        packTypes: new Set(),
      })
    }
    const item = map.get(brand)
    item.count += 1
    item.amount += Number(row.amount) || 0
    const date = String(row.date || '').trim()
    if (date && (!item.lastDate || date > item.lastDate)) {
      item.lastDate = date
    }
    const channel = String(row.channel || '').trim()
    if (channel) item.channels.add(channel)
    const packType = resolveBeadPackType(row.spec)
    if (packType) item.packTypes.add(packType)
  })

  return [...map.values()]
    .map((item) => {
      const packTypes = []
      if (item.packTypes.has('全套')) packTypes.push('全套')
      if (item.packTypes.has('补充装')) packTypes.push('补充装')
      return {
        brand: item.brand,
        count: item.count,
        amount: Math.round(item.amount * 100) / 100,
        lastDate: item.lastDate,
        channels: [...item.channels],
        packTypes,
        packTypeLabel: packTypes.length ? packTypes.join('、') : '—',
      }
    })
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      if (b.count !== a.count) return b.count - a.count
      return a.brand.localeCompare(b.brand, 'zh-CN')
    })
}

export function buildBrandFrequencyChartData(brandStats = []) {
  const list = [...brandStats].sort((a, b) => b.count - a.count || b.amount - a.amount)
  return {
    categories: list.map((item) => item.brand),
    amounts: list.map((item) => item.count),
  }
}

export function buildBrandAmountChartData(brandStats = []) {
  const list = [...brandStats].sort((a, b) => b.amount - a.amount || b.count - a.count)
  return {
    categories: list.map((item) => item.brand),
    amounts: list.map((item) => item.amount),
  }
}

/** 品牌购买：次数 + 金额；会回购在前，否回购置底，组内按金额降序 */
export function buildBrandComboChartData(brandStats = [], options = {}) {
  const noRepurchaseBrands = options.noRepurchaseBrands instanceof Set
    ? options.noRepurchaseBrands
    : new Set(options.noRepurchaseBrands || [])
  const list = [...brandStats].sort((a, b) => {
    const aBottom = noRepurchaseBrands.has(a.brand) ? 1 : 0
    const bBottom = noRepurchaseBrands.has(b.brand) ? 1 : 0
    if (aBottom !== bBottom) return aBottom - bBottom
    return b.amount - a.amount || b.count - a.count || a.brand.localeCompare(b.brand, 'zh-CN')
  })
  return {
    categories: list.map((item) => item.brand),
    counts: list.map((item) => item.count),
    amounts: list.map((item) => Math.round((Number(item.amount) || 0) * 100) / 100),
  }
}

/** 拼豆类目按月购买趋势 */
export function buildBeadPurchaseMonthlyTrend(expenses = []) {
  const map = new Map()

  expenses.forEach((row) => {
    if (!isBeadExpenseCategory(row.category)) return
    const date = String(row.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const month = date.slice(0, 7)
    if (!map.has(month)) map.set(month, { count: 0, amount: 0 })
    const item = map.get(month)
    item.count += 1
    item.amount += Number(row.amount) || 0
  })

  const months = [...map.keys()].sort((a, b) => a.localeCompare(b))
  return {
    categories: months,
    labels: months.map((month) => {
      const [year, m] = month.split('-')
      return `${year.slice(2)}/${m}`
    }),
    counts: months.map((month) => map.get(month).count),
    amounts: months.map((month) => Math.round(map.get(month).amount * 100) / 100),
  }
}

/**
 * 品牌 × 月份：看每个牌子分别在哪几个月买过
 * @param {Array} expenses
 * @param {{ noRepurchaseBrands?: Set<string>|Iterable<string> }} [options]
 *   会回购在前、「不再回购」置底；组内仍按金额→次数
 */
export function buildBrandMonthPurchaseMatrix(expenses = [], options = {}) {
  const noRepurchaseBrands = options.noRepurchaseBrands instanceof Set
    ? options.noRepurchaseBrands
    : new Set(options.noRepurchaseBrands || [])
  const brandMonth = new Map()
  const brandTotals = new Map()
  const monthSet = new Set()

  expenses.forEach((row) => {
    if (!isBeadExpenseCategory(row.category)) return
    const brand = String(row.brand || '').trim()
    if (!brand) return
    const date = String(row.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const month = date.slice(0, 7)
    monthSet.add(month)

    if (!brandMonth.has(brand)) brandMonth.set(brand, new Map())
    const monthMap = brandMonth.get(brand)
    if (!monthMap.has(month)) monthMap.set(month, { count: 0, amount: 0 })
    const cell = monthMap.get(month)
    cell.count += 1
    cell.amount += Number(row.amount) || 0

    const prev = brandTotals.get(brand) || { count: 0, amount: 0 }
    prev.count += 1
    prev.amount += Number(row.amount) || 0
    brandTotals.set(brand, prev)
  })

  const months = [...monthSet].sort((a, b) => a.localeCompare(b))
  const brands = [...brandTotals.entries()]
    .sort((a, b) => {
      const aBottom = noRepurchaseBrands.has(a[0]) ? 1 : 0
      const bBottom = noRepurchaseBrands.has(b[0]) ? 1 : 0
      if (aBottom !== bBottom) return aBottom - bBottom
      return (
        b[1].amount - a[1].amount ||
        b[1].count - a[1].count ||
        a[0].localeCompare(b[0], 'zh-CN')
      )
    })
    .map(([brand]) => brand)

  const monthLabels = months.map((month) => {
    const [year, m] = month.split('-')
    return `${year.slice(2)}/${m}`
  })

  const cells = []
  const rows = []
  let maxCount = 0
  brands.forEach((brand, brandIndex) => {
    const monthMap = brandMonth.get(brand) || new Map()
    const rowCells = []
    months.forEach((month, monthIndex) => {
      const cell = monthMap.get(month)
      const count = cell?.count || 0
      const amount = Math.round((cell?.amount || 0) * 100) / 100
      if (count > maxCount) maxCount = count
      const entry = {
        monthIndex,
        brandIndex,
        month,
        brand,
        count,
        amount,
        label: monthLabels[monthIndex],
      }
      cells.push(entry)
      rowCells.push(entry)
    })
    rows.push({
      brand,
      brandIndex,
      willRepurchase: !noRepurchaseBrands.has(brand),
      cells: rowCells,
    })
  })

  return {
    months,
    monthLabels,
    brands,
    rows,
    cells,
    maxCount,
    brandCount: brands.length,
    monthCount: months.length,
  }
}

/** 某品牌每次拼豆购买明细（按日期新→旧） */
export function listBeadBrandPurchases(expenses = [], brand = '', options = {}) {
  const key = String(brand || '').trim()
  if (!key) return []
  const monthStart = String(options.monthStart || '').trim()
  const monthEnd = String(options.monthEnd || '').trim()
  return expenses
    .filter((row) => {
      if (!isBeadExpenseCategory(row.category)) return false
      if (String(row.brand || '').trim() !== key) return false
      if (!monthStart && !monthEnd) return true
      const date = String(row.date || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
      const month = date.slice(0, 7)
      if (monthStart && month < monthStart) return false
      if (monthEnd && month > monthEnd) return false
      return true
    })
    .map((row) => {
      const packType = resolveBeadPackType(row.spec)
      return {
        id: row.id,
        date: String(row.date || '').trim(),
        spec: String(row.spec || '').trim(),
        packType,
        packTypeLabel: packType || (row.spec ? String(row.spec).trim() : '—'),
        channel: String(row.channel || '').trim(),
        amount: Number(row.amount) || 0,
        note: String(row.note || '').trim(),
      }
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return String(b.id).localeCompare(String(a.id))
    })
}

export function useBrandReviews() {
  const { user } = useAuth()
  const { linkedExpenses } = useCostData()

  watch(
    () => user.value?.id,
    (userId) => {
      reviewsByUser.value = loadReviewsFromStorage(userId)
    },
    { immediate: true },
  )

  const persistReviews = () => {
    if (!user.value?.id) return
    localStorage.setItem(reviewsStorageKey(user.value.id), JSON.stringify(reviewsByUser.value))
  }

  const brandStats = computed(() => buildBeadBrandStats(linkedExpenses.value))

  const brandReviews = computed(() =>
    brandStats.value
      .map((item) => {
        const review = reviewsByUser.value[item.brand] || {}
        return {
          ...item,
          comment: String(review.comment || ''),
          pros: String(review.pros || ''),
          cons: String(review.cons || ''),
          willRepurchase: normalizeWillRepurchase(review.willRepurchase),
          repurchaseColors: normalizeRepurchaseColors(review.repurchaseColors),
          bannedColors: normalizeRepurchaseColors(review.bannedColors),
          updatedAt: review.updatedAt || '',
        }
      })
      .sort((a, b) => {
        // 「不再回购」置底，其余按购买次数降序
        const aBottom = a.willRepurchase === false ? 1 : 0
        const bBottom = b.willRepurchase === false ? 1 : 0
        if (aBottom !== bBottom) return aBottom - bBottom
        if (b.count !== a.count) return b.count - a.count
        if (b.amount !== a.amount) return b.amount - a.amount
        return a.brand.localeCompare(b.brand, 'zh-CN')
      }),
  )

  /** 测评里选了「否」的品牌，记一笔品牌下拉里不再出现 */
  const noRepurchaseBrandSet = computed(() => {
    const set = new Set()
    Object.entries(reviewsByUser.value || {}).forEach(([brand, review]) => {
      const key = String(brand || '').trim()
      if (!key) return
      if (normalizeWillRepurchase(review?.willRepurchase) === false) {
        set.add(key)
      }
    })
    return set
  })

  const summary = computed(() => {
    const list = brandStats.value
    return {
      brandCount: list.length,
      purchaseCount: list.reduce((sum, item) => sum + item.count, 0),
      totalAmount: list.reduce((sum, item) => sum + item.amount, 0),
    }
  })

  const upsertReview = (brand, payload) => {
    const key = String(brand || '').trim()
    if (!key) return
    const prev = reviewsByUser.value[key] || {}
    const nextWillRepurchase =
      payload.willRepurchase !== undefined
        ? normalizeWillRepurchase(payload.willRepurchase)
        : normalizeWillRepurchase(prev.willRepurchase)
    let nextColors =
      payload.repurchaseColors !== undefined
        ? normalizeRepurchaseColors(payload.repurchaseColors)
        : normalizeRepurchaseColors(prev.repurchaseColors)
    let nextBanned =
      payload.bannedColors !== undefined
        ? normalizeRepurchaseColors(payload.bannedColors)
        : normalizeRepurchaseColors(prev.bannedColors)
    // 回购 / 禁选互斥：后写入的一侧优先，去掉另一侧的重叠色号
    if (payload.bannedColors !== undefined && payload.repurchaseColors === undefined) {
      const bannedSet = new Set(nextBanned)
      nextColors = nextColors.filter((code) => !bannedSet.has(code))
    } else if (payload.repurchaseColors !== undefined && payload.bannedColors === undefined) {
      const buySet = new Set(nextColors)
      nextBanned = nextBanned.filter((code) => !buySet.has(code))
    } else {
      const bannedSet = new Set(nextBanned)
      nextColors = nextColors.filter((code) => !bannedSet.has(code))
    }
    reviewsByUser.value = {
      ...reviewsByUser.value,
      [key]: {
        comment: String(payload.comment ?? prev.comment ?? '').trim(),
        pros: String(payload.pros ?? prev.pros ?? '').trim(),
        cons: String(payload.cons ?? prev.cons ?? '').trim(),
        willRepurchase: nextWillRepurchase,
        repurchaseColors: nextColors,
        bannedColors: nextBanned,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    }
    persistReviews()
  }

  const getBrandPurchases = (brand, options = {}) =>
    listBeadBrandPurchases(linkedExpenses.value, brand, options)

  return {
    brandStats,
    brandReviews,
    noRepurchaseBrandSet,
    summary,
    upsertReview,
    getBrandPurchases,
    formatCostAmount,
  }
}
