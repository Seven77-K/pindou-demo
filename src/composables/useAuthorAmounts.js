import { ref, watch } from 'vue'
import {
  deleteAuthorAmount as deleteAuthorAmountApi,
  fetchAuthorAmounts,
  renameAuthor as renameAuthorApi,
  upsertAuthorAmount as upsertAuthorAmountApi,
} from '@/api/authorAmount'
import { useAuth } from '@/composables/useAuth'

const authorAmountsMap = ref({})
const authorAmountsLoaded = ref(false)
let loadPromise = null

export function buildAuthorAmountKey(author, buyer) {
  return `${String(author || '').trim()}::${String(buyer || '').trim()}`
}

export function parseAuthorAmountKey(key) {
  const sep = String(key || '').lastIndexOf('::')
  if (sep < 0) {
    return { author: String(key || '').trim(), buyer: '' }
  }
  return {
    author: key.slice(0, sep).trim(),
    buyer: key.slice(sep + 2).trim(),
  }
}

export function normalizeAuthorAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.round(num * 100) / 100
}

function todayStr() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function rowsToMap(rows) {
  const next = {}
  ;(rows || []).forEach((item) => {
    const amount = normalizeAuthorAmount(item?.amount)
    if (amount <= 0) return
    const key = item?.key || buildAuthorAmountKey(item?.author, item?.buyer)
    next[key] = {
      amount,
      date: String(item?.date || '').trim().slice(0, 10) || todayStr(),
    }
  })
  return next
}

function loadMergedLocalStorage() {
  const merged = {}
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index)
      if (!storageKey?.startsWith('pindou-admin-author-amounts-')) continue
      const raw = localStorage.getItem(storageKey)
      if (!raw) continue
      const data = JSON.parse(raw)
      if (!data || typeof data !== 'object') continue
      Object.entries(data).forEach(([key, item]) => {
        const amount = normalizeAuthorAmount(item?.amount)
        if (amount <= 0) return
        merged[key] = {
          amount,
          date: String(item?.date || '').trim().slice(0, 10) || todayStr(),
        }
      })
    }
  } catch {
    return {}
  }
  return merged
}

async function migrateLocalStorageToServer(localMap) {
  const entries = Object.entries(localMap || {})
  if (!entries.length) return

  await Promise.all(
    entries.map(([key, item]) => {
      const { author, buyer } = parseAuthorAmountKey(key)
      return upsertAuthorAmountApi({
        author,
        buyer,
        amount: item.amount,
        date: item.date,
      })
    }),
  )
}

async function loadAuthorAmounts() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const rows = await fetchAuthorAmounts()
      let nextMap = rowsToMap(rows)

      if (!Object.keys(nextMap).length) {
        const localMap = loadMergedLocalStorage()
        if (Object.keys(localMap).length) {
          await migrateLocalStorageToServer(localMap)
          const migratedRows = await fetchAuthorAmounts()
          nextMap = rowsToMap(migratedRows)
        }
      }

      authorAmountsMap.value = nextMap
      authorAmountsLoaded.value = true
    } catch {
      authorAmountsMap.value = loadMergedLocalStorage()
      authorAmountsLoaded.value = true
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

export function useAuthorAmounts() {
  const { user } = useAuth()

  watch(
    () => user.value?.id,
    (userId) => {
      if (!userId) {
        authorAmountsMap.value = {}
        authorAmountsLoaded.value = false
        loadPromise = null
        return
      }
      loadAuthorAmounts()
    },
    { immediate: true },
  )

  const getAmount = (author, buyer) => {
    const key = buildAuthorAmountKey(author, buyer)
    return normalizeAuthorAmount(authorAmountsMap.value[key]?.amount)
  }

  const getDate = (author, buyer) => {
    const key = buildAuthorAmountKey(author, buyer)
    return String(authorAmountsMap.value[key]?.date || '').trim().slice(0, 10)
  }

  const setAmount = async (author, buyer, amount, date) => {
    const key = buildAuthorAmountKey(author, buyer)
    const normalized = normalizeAuthorAmount(amount)
    const next = { ...authorAmountsMap.value }

    if (normalized <= 0) {
      delete next[key]
      authorAmountsMap.value = next
      await deleteAuthorAmountApi({ author, buyer })
      return
    }

    const normalizedDate =
      String(date || '').trim().slice(0, 10) || next[key]?.date || todayStr()
    next[key] = { amount: normalized, date: normalizedDate }
    authorAmountsMap.value = next

    try {
      const saved = await upsertAuthorAmountApi({
        author,
        buyer,
        amount: normalized,
        date: normalizedDate,
      })
      if (saved?.key) {
        authorAmountsMap.value = {
          ...authorAmountsMap.value,
          [saved.key]: {
            amount: normalizeAuthorAmount(saved.amount),
            date: saved.date || normalizedDate,
          },
        }
      }
    } catch (error) {
      await loadAuthorAmounts()
      throw error
    }
  }

  const removeAmount = async (key) => {
    if (!authorAmountsMap.value[key]) return
    const { author, buyer } = parseAuthorAmountKey(key)
    const next = { ...authorAmountsMap.value }
    delete next[key]
    authorAmountsMap.value = next
    await deleteAuthorAmountApi({ author, buyer })
  }

  const renameAuthor = async (from, to) => {
    const oldName = String(from || '').trim()
    const newName = String(to || '').trim()
    if (!oldName) throw new Error('原作者名称不能为空')
    if (!newName) throw new Error('请填写作者名称')
    if (oldName === newName) {
      return { from: oldName, to: newName, updatedPatterns: 0, renamedAmounts: 0 }
    }

    const result = await renameAuthorApi({ from: oldName, to: newName })
    await loadAuthorAmounts()
    return result
  }

  const listExpenseRows = (buyerFilter = '') => {
    void authorAmountsMap.value
    const filter = String(buyerFilter || '').trim()
    return Object.entries(authorAmountsMap.value)
      .map(([key, item]) => {
        const { author, buyer } = parseAuthorAmountKey(key)
        return {
          key,
          author,
          buyer,
          amount: normalizeAuthorAmount(item.amount),
          date: item.date || todayStr(),
        }
      })
      .filter((item) => item.amount > 0)
      .filter((item) => !filter || item.buyer === filter)
  }

  const listAuthorNames = (buyerFilter = '') => {
    void authorAmountsMap.value
    const filter = String(buyerFilter || '').trim()
    const set = new Set()
    Object.entries(authorAmountsMap.value).forEach(([key, item]) => {
      if (normalizeAuthorAmount(item.amount) <= 0) return
      const { author, buyer } = parseAuthorAmountKey(key)
      if (!author) return
      if (filter && buyer !== filter) return
      set.add(author)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }

  return {
    authorAmountsMap,
    authorAmountsLoaded,
    getAmount,
    getDate,
    setAmount,
    removeAmount,
    renameAuthor,
    listExpenseRows,
    listAuthorNames,
    reloadAuthorAmounts: loadAuthorAmounts,
  }
}
