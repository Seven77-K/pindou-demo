<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <h3>图纸作者</h3>
        <span class="header-badge">共 {{ filteredList.length }} 位作者</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="openSummaryCharts">汇总分析</button>
        <button type="button" class="btn-primary" @click="openCreate">新增作者</button>
      </div>
    </div>

    <div class="tab-bar">
      <div class="tab-group tab-group-buyer">
        <span class="tab-group-label">购买人</span>
        <button v-for="buyer in buyerOptions" :key="buyer" type="button" class="tab-item tab-item-buyer"
          :class="{ 'tab-item-active': activeBuyerTab === buyer }" @click="activeBuyerTab = buyer">
          {{ buyer }}
        </button>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>作者名称</label>
          <input v-model="searchName" type="text" placeholder="请输入作者名称" />
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">重置</button>
      </div>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <colgroup>
          <col class="col-index" />
          <col class="col-name" />
          <col class="col-buyer" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-amount" />
          <col class="col-amount" />
          <col class="col-date" />
          <col class="col-date" />
          <col class="col-amount" />
          <col class="col-action" />
        </colgroup>
        <thead>
          <tr>
            <th class="col-index">序号</th>
            <th class="col-name">作者名称</th>
            <th class="col-buyer">购买人</th>
            <th v-for="col in sortableColumns" :key="col.key"
              :class="[col.className, 'sortable-th', sortHeaderClass(col.key)]" @click="toggleSort(col.key)">
              <span class="sort-label">
                {{ col.label }}
                <span class="sort-arrows" aria-hidden="true">
                  <span class="sort-arrow sort-up">▲</span>
                  <span class="sort-arrow sort-down">▼</span>
                </span>
              </span>
            </th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableRows" :key="row.item?.name ?? `empty-${index}`" :class="{
            'row-editing': row.item && isEditing(row.item),
            'row-empty': !row.item,
          }">
            <template v-if="row.item">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="col-name">
                <div v-if="isEditing(row.item)" class="cell-editor cell-editor--name">
                  <input v-model="editName" type="text" class="name-input" placeholder="作者名称"
                    @keyup.enter="saveEdit(row.item)" />
                </div>
                <button v-else type="button" class="author-link" @click="viewPatterns(row.item)">
                  {{ row.item.name }}
                </button>
              </td>
              <td class="col-buyer">{{ row.item.buyer }}</td>
              <td>{{ row.item.total }}</td>
              <td>{{ row.item.free }}</td>
              <td>{{ row.item.paid }}</td>
              <td>{{ row.item.member }}</td>
              <td>{{ row.item.completed }}</td>
              <td>{{ row.item.pending }}</td>
              <td>{{ row.item.rate }}%</td>
              <td class="col-amount">
                <button v-if="hasReleasedAmount(row.item)" type="button" class="amount-link"
                  @click="openReleasedAmount(row.item)">
                  {{ formatMemberAmount(row.item.releasedAmount) }}
                </button>
                <span v-else>{{ formatMemberAmount(row.item.releasedAmount) }}</span>
              </td>
              <td class="col-amount">
                <button v-if="hasCompletedAmount(row.item)" type="button" class="amount-link"
                  @click="openCompletedAmount(row.item)">
                  {{ formatMemberAmount(row.item.completedAmount) }}
                </button>
                <span v-else>{{ formatMemberAmount(row.item.completedAmount) }}</span>
              </td>
              <td class="col-date">
                <div v-if="isEditing(row.item)" class="cell-editor cell-editor--date">
                  <el-date-picker v-model="editDate" type="date" value-format="YYYY-MM-DD" placeholder="日期"
                    :clearable="false" size="small" teleported popper-class="author-date-popper"
                    class="date-picker-field" />
                </div>
                <span v-else>{{ formatPurchaseDate(row.item.memberDate) }}</span>
              </td>
              <td class="col-date">{{ formatPurchaseDate(row.item.lastUpdateDate) }}</td>
              <td class="col-amount">
                <div v-if="isEditing(row.item)" class="cell-editor cell-editor--amount">
                  <input v-model="editAmount" type="text" inputmode="decimal" class="amount-input" placeholder="0.00"
                    @keyup.enter="saveEdit(row.item)" />
                </div>
                <span v-else>{{ formatMemberAmount(row.item.memberAmount) }}</span>
              </td>
              <td>
                <span class="action-links">
                  <a v-if="!isEditing(row.item)" class="link" @click="startEdit(row.item)">编辑</a>
                  <template v-else>
                    <a class="link" :class="{ 'link-disabled': saving }" @click="saveEdit(row.item)">保存</a>
                    <a class="link link-muted" :class="{ 'link-disabled': saving }" @click="cancelEdit">取消</a>
                  </template>
                  <a v-if="!isEditing(row.item)" class="link" @click="openTypePie(row.item.name)">类型占比</a>
                  <a v-if="!isEditing(row.item)" class="link" @click="openPatternTrend(row.item.name)">每月图纸</a>
                  <a v-if="!isEditing(row.item) && canDeleteAuthor(row.item)" class="link link-danger"
                    @click="openDeleteConfirm(row.item)">
                    删除
                  </a>
                </span>
              </td>
            </template>
            <template v-else-if="!filteredList.length && index === 0">
              <td colspan="16" class="empty-cell">暂无作者数据</td>
            </template>
            <template v-else>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">
        共 {{ filteredList.length }} 条，总计 {{ formatCostAmount(filteredTotalAmount) }}，总出图纸金额 {{
          formatCostAmount(filteredTotalReleasedAmount) }}，已拼 {{
          formatCostAmount(filteredTotalCompletedAmount) }}
      </span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages"
        @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages"
        @click="currentPage = totalPages">尾页</button>
    </div>

    <AuthorTypePieDialog v-model:visible="pieVisible" :author="pieAuthor" />

    <AuthorSummaryChartsDialog v-model:visible="summaryVisible" :buyer="activeBuyerTab" :authors="filteredList" />

    <AuthorPatternTrendDialog v-model:visible="trendVisible" :author="trendAuthor" :buyer="activeBuyerTab" />

    <AuthorCompletedPatternsDialog
      v-model:visible="patternListVisible"
      :author="patternListAuthor"
      :title="patternListTitle"
      :patterns="patternListPatterns"
      :show-buyer="false"
      show-amount
      :list-hint="patternListHint"
    />

    <AuthorCreateDialog v-model:visible="createVisible" :buyer="activeBuyerTab" :saving="creating"
      @submit="handleCreate" />

    <el-dialog draggable v-model="deleteVisible" title="确认删除" width="400px">
      <p class="confirm-text">确定删除作者「{{ deleteTarget?.name }}」吗？</p>
      <p class="confirm-tip">该作者暂无图纸，删除后将移除会员金额记录。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  buildAuthorSummaryList,
  getAuthorCompletedPatterns,
  getAuthorPatterns,
  getAuthorReleasedPatterns,
  loadPatterns,
  usePatternData,
} from '@/composables/usePatternData'
import {
  buildAuthorAmountKey,
  normalizeAuthorAmount,
  parseAuthorAmountKey,
  useAuthorAmounts,
} from '@/composables/useAuthorAmounts'
import { formatCostAmount } from '@/composables/useCostData'
import { getDefaultMemberBuyer } from '@/config/permissions'
import AuthorCreateDialog from './components/AuthorCreateDialog.vue'
import AuthorTypePieDialog from './components/AuthorTypePieDialog.vue'
import AuthorSummaryChartsDialog from './components/AuthorSummaryChartsDialog.vue'
import AuthorPatternTrendDialog from './components/AuthorPatternTrendDialog.vue'
import AuthorCompletedPatternsDialog from '@/view/statistics/components/AuthorCompletedPatternsDialog.vue'
import { useListTablePagination } from '@/composables/useListTablePagination'

const { user } = useAuth()
const { memberPatterns, buyerOptions } = usePatternData()
const { authorAmountsMap, getAmount, getDate, setAmount, removeAmount, renameAuthor } = useAuthorAmounts()

const searchName = ref('')
const activeBuyerTab = ref(buyerOptions[0])
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()
const sortKey = ref('total')
const sortOrder = ref('desc')
const pieVisible = ref(false)
const pieAuthor = ref('')
const summaryVisible = ref(false)
const trendVisible = ref(false)
const trendAuthor = ref('')
const patternListMode = ref('') // all | completed | released
const patternListAuthor = ref('')
const patternListBuyer = ref('')
const createVisible = ref(false)
const creating = ref(false)
const deleteVisible = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const editingKey = ref('')
const editName = ref('')
const editAmount = ref('')
const editDate = ref('')
const saving = ref(false)

const buildStandaloneAuthors = (buyer, existingNames) => {
  const names = new Set(existingNames)
  const extras = []

  Object.entries(authorAmountsMap.value).forEach(([key, item]) => {
    const { author, buyer: rowBuyer } = parseAuthorAmountKey(key)
    if (rowBuyer !== buyer) return
    if (!author || names.has(author)) return
    if (normalizeAuthorAmount(item.amount) <= 0) return

    names.add(author)
    extras.push({
      name: author,
      total: 0,
      free: 0,
      paid: 0,
      member: 0,
      completed: 0,
      pending: 0,
      completedAmount: 0,
      releasedAmount: 0,
      lastUpdateDate: '',
      buyer,
      rate: 0,
      memberAmount: getAmount(author, buyer),
      memberDate: getDate(author, buyer),
    })
  })

  return extras.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

const authorList = computed(() => {
  void authorAmountsMap.value
  const buyer = activeBuyerTab.value
  const fromPatterns = buildAuthorSummaryList(memberPatterns.value, { buyer }).map((item) => ({
    ...item,
    buyer,
    memberAmount: getAmount(item.name, buyer),
    memberDate: getDate(item.name, buyer),
  }))
  const patternNames = new Set(fromPatterns.map((item) => item.name))
  const standaloneAuthors = buildStandaloneAuthors(buyer, patternNames)
  return [...fromPatterns, ...standaloneAuthors]
})

const filteredList = computed(() => {
  const keyword = searchName.value.trim()
  if (!keyword) return authorList.value
  return authorList.value.filter((item) => item.name.includes(keyword))
})

const sortableColumns = [
  { key: 'total', label: '总数', className: 'col-num' },
  { key: 'free', label: '免费', className: 'col-num' },
  { key: 'paid', label: '付费', className: 'col-num' },
  { key: 'member', label: '会员', className: 'col-num' },
  { key: 'completed', label: '已完成', className: 'col-num' },
  { key: 'pending', label: '未完成', className: 'col-num' },
  { key: 'rate', label: '完成率', className: 'col-num' },
  { key: 'releasedAmount', label: '已出金额', className: 'col-amount' },
  { key: 'completedAmount', label: '已拼金额', className: 'col-amount' },
  { key: 'memberDate', label: '购买日期', className: 'col-date' },
  { key: 'lastUpdateDate', label: '更新日期', className: 'col-date' },
  { key: 'memberAmount', label: '会员金额', className: 'col-amount' },
]

const getSortValue = (item, key) => {
  if (key === 'memberAmount') return normalizeAuthorAmount(item.memberAmount)
  if (key === 'releasedAmount') return normalizeAuthorAmount(item.releasedAmount)
  if (key === 'completedAmount') return normalizeAuthorAmount(item.completedAmount)
  if (key === 'memberDate') return String(item.memberDate || '').trim()
  if (key === 'lastUpdateDate') return String(item.lastUpdateDate || '').trim()
  if (key === 'rate') return Number(item.rate) || 0
  return Number(item[key]) || 0
}

const compareAuthors = (a, b, key, dir) => {
  if (key === 'memberDate' || key === 'lastUpdateDate') {
    const dateA = getSortValue(a, key)
    const dateB = getSortValue(b, key)
    if (!dateA && !dateB) return a.name.localeCompare(b.name, 'zh-CN')
    if (!dateA) return 1
    if (!dateB) return -1
    const cmp = dateA.localeCompare(dateB)
    return cmp !== 0 ? cmp * dir : a.name.localeCompare(b.name, 'zh-CN')
  }

  const diff = getSortValue(a, key) - getSortValue(b, key)
  if (diff !== 0) return diff * dir
  return a.name.localeCompare(b.name, 'zh-CN')
}

const sortedList = computed(() => {
  const dir = sortOrder.value === 'asc' ? 1 : -1
  return [...filteredList.value].sort((a, b) => compareAuthors(a, b, sortKey.value, dir))
})

const sortHeaderClass = (key) => {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
  currentPage.value = 1
  cancelEdit()
}

const resetSort = () => {
  sortKey.value = 'total'
  sortOrder.value = 'desc'
}

const filteredTotalAmount = computed(() =>
  filteredList.value.reduce((sum, item) => sum + normalizeAuthorAmount(item.memberAmount), 0),
)

const filteredTotalReleasedAmount = computed(() =>
  filteredList.value.reduce((sum, item) => sum + normalizeAuthorAmount(item.releasedAmount), 0),
)

const filteredTotalCompletedAmount = computed(() =>
  filteredList.value.reduce((sum, item) => sum + normalizeAuthorAmount(item.completedAmount), 0),
)

const resetSearch = () => {
  searchName.value = ''
}

const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedList.value.slice(start, start + pageSize.value)
})

const tableRows = computed(() => {
  const rows = pagedList.value.map((item) => ({ item }))
  while (rows.length < pageSize.value) {
    rows.push({ item: null })
  }
  return rows
})

const openTypePie = (author) => {
  pieAuthor.value = author
  pieVisible.value = true
}

const openSummaryCharts = () => {
  summaryVisible.value = true
}

const openPatternTrend = (author) => {
  trendAuthor.value = author
  trendVisible.value = true
}

const patternListVisible = computed({
  get: () => Boolean(patternListMode.value),
  set: (visible) => {
    if (visible) return
    patternListMode.value = ''
    patternListAuthor.value = ''
    patternListBuyer.value = ''
  },
})

const patternListPatterns = computed(() => {
  if (patternListMode.value === 'released') {
    return getAuthorReleasedPatterns(memberPatterns.value, patternListAuthor.value, {
      buyer: patternListBuyer.value,
    })
  }
  if (patternListMode.value === 'completed') {
    return getAuthorCompletedPatterns(memberPatterns.value, patternListAuthor.value, {
      buyer: patternListBuyer.value,
    })
  }
  if (patternListMode.value === 'all') {
    return getAuthorPatterns(memberPatterns.value, patternListAuthor.value, {
      buyer: patternListBuyer.value,
    })
  }
  return []
})

const patternListTitle = computed(() => {
  if (!patternListAuthor.value) {
    if (patternListMode.value === 'released') return '已出图纸金额'
    if (patternListMode.value === 'completed') return '已完成金额'
    return '作者图纸'
  }
  const buyer = patternListBuyer.value ? ` · ${patternListBuyer.value}` : ''
  const suffix =
    patternListMode.value === 'released'
      ? '已出图纸金额'
      : patternListMode.value === 'completed'
        ? '已完成金额'
        : '全部图纸'
  return `${patternListAuthor.value}${buyer} · ${suffix}`
})

const patternListHint = computed(() => {
  if (patternListMode.value === 'released') return '会员/付费图纸'
  if (patternListMode.value === 'completed') return '已完成图纸'
  return '图纸'
})

const hasCompletedAmount = (item) => normalizeAuthorAmount(item?.completedAmount) > 0

const openCompletedAmount = (item) => {
  if (!hasCompletedAmount(item)) return
  patternListAuthor.value = item.name
  patternListBuyer.value = item.buyer || activeBuyerTab.value
  patternListMode.value = 'completed'
}

const hasReleasedAmount = (item) => normalizeAuthorAmount(item?.releasedAmount) > 0

const openReleasedAmount = (item) => {
  if (!hasReleasedAmount(item)) return
  patternListAuthor.value = item.name
  patternListBuyer.value = item.buyer || activeBuyerTab.value
  patternListMode.value = 'released'
}

const getRowKey = (item) => buildAuthorAmountKey(item.name, item.buyer)

const isEditing = (item) => editingKey.value === getRowKey(item)

const canDeleteAuthor = (item) => {
  const name = item.name?.trim()
  if (!name) return false
  return !memberPatterns.value.some((pattern) => pattern.author?.trim() === name)
}

const formatMemberAmount = (value) => {
  const amount = normalizeAuthorAmount(value)
  return amount > 0 ? formatCostAmount(amount) : '—'
}

const formatPurchaseDate = (value) => {
  const date = String(value || '').trim().slice(0, 10)
  return date || '—'
}

const startEdit = (item) => {
  editingKey.value = getRowKey(item)
  editName.value = item.name || ''
  const amount = getAmount(item.name, activeBuyerTab.value)
  editAmount.value = amount > 0 ? String(amount) : ''
  editDate.value = getDate(item.name, activeBuyerTab.value)
}

const saveEdit = async (item) => {
  if (saving.value) return

  const nextName = editName.value.trim()
  if (!nextName) {
    window.alert('请填写作者名称')
    return
  }

  saving.value = true
  try {
    const oldName = item.name
    if (nextName !== oldName) {
      await renameAuthor(oldName, nextName)
      await loadPatterns(true)
    }

    const nextAmount = normalizeAuthorAmount(editAmount.value)
    const currentAmount = getAmount(nextName, item.buyer)
    if (nextAmount > 0 || currentAmount > 0) {
      await setAmount(nextName, item.buyer, editAmount.value, editDate.value)
    }

    cancelEdit()
  } catch (error) {
    window.alert(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const cancelEdit = () => {
  editingKey.value = ''
  editName.value = ''
  editAmount.value = ''
  editDate.value = ''
}

const viewPatterns = (item) => {
  const name = item?.name?.trim()
  if (!name) return
  patternListAuthor.value = name
  patternListBuyer.value = item.buyer || activeBuyerTab.value
  patternListMode.value = 'all'
}

const openCreate = () => {
  createVisible.value = true
}

const handleCreate = async (payload) => {
  creating.value = true
  try {
    await setAmount(payload.name, payload.buyer, payload.amount, payload.date)
    createVisible.value = false
  } catch (error) {
    window.alert(error?.message || '新增失败')
  } finally {
    creating.value = false
  }
}

const openDeleteConfirm = (item) => {
  if (!canDeleteAuthor(item)) return
  deleteTarget.value = item
  deleteVisible.value = true
}

const confirmDelete = async () => {
  const item = deleteTarget.value
  if (!item || !canDeleteAuthor(item)) return

  deleting.value = true
  try {
    await removeAmount(buildAuthorAmountKey(item.name, item.buyer))
    deleteVisible.value = false
    deleteTarget.value = null
    cancelEdit()
  } catch (error) {
    window.alert(error?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

watch(searchName, () => {
  currentPage.value = 1
  cancelEdit()
})

watch(activeBuyerTab, () => {
  currentPage.value = 1
  resetSort()
  cancelEdit()
})

watch(
  () => [user.value?.id, user.value?.permissions],
  () => {
    activeBuyerTab.value = getDefaultMemberBuyer(user.value)
  },
  { immediate: true, deep: true },
)

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

onMounted(() => {
  loadPatterns(true)
})

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) loadPatterns(true)
  }
)
</script>

<style scoped>
.page-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-width: 100%;
  min-height: 0;
  padding: 20px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.page-header {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-primary {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: var(--color-accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.92;
}

.btn-secondary {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-pale);
}

.page-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 17px;
}

.header-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-pale);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.tab-bar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
}

.tab-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.tab-group-buyer {
  width: 100%;
}

.tab-group-label {
  flex-shrink: 0;
  padding: 0 6px 0 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.tab-item {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-item-buyer {
  min-width: 56px;
}

.tab-item:hover {
  color: var(--color-text-primary);
}

.tab-item-active {
  background: #fff;
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(250, 208, 196, 0.45);
}

.tab-group-buyer .tab-item-active {
  color: var(--color-accent-deep, var(--color-accent));
}

.search-bar {
  flex-shrink: 0;
  width: 100%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-item label {
  flex-shrink: 0;
  min-width: 56px;
  color: var(--color-text-regular);
  font-size: 14px;
  font-weight: 500;
}

.search-item input,
.search-item select {
  width: 180px;
  max-width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-pale);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search-item input:focus,
.search-item select:focus {
  border-color: var(--color-accent);
  background: #fff;
}

.btn-search-reset {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-search-reset:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.table-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.data-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
  border-collapse: collapse;
}

th,
td {
  box-sizing: border-box;
  padding: 0 4px;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

th {
  color: var(--color-text-secondary);
  font-weight: 500;
  background: var(--color-pale);
}

.sortable-th {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.sortable-th:hover {
  color: var(--color-accent);
}

.sort-label {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  justify-content: center;
  max-width: 100%;
}

.sort-arrows {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
}

.sort-arrow {
  color: #d4c4cc;
  font-size: 9px;
  line-height: 1;
}

.sortable-th.sort-desc .sort-down,
.sortable-th.sort-asc .sort-up {
  color: var(--color-accent);
}

tbody tr:hover:not(.row-empty) {
  background: #fff9fb;
}

.col-index {
  width: 3%;
}

.col-name {
  width: 9%;
}

.col-buyer {
  width: 5%;
}

.col-num {
  width: 5.1%;
}

.col-date {
  width: 7.2%;
}

.col-amount {
  width: 7.2%;
}

.col-action {
  width: 11%;
}

td.col-date {
  overflow: hidden;
  text-overflow: ellipsis;
}

td.col-action {
  white-space: normal;
}

td.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-link {
  display: inline-block;
  max-width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.author-link:hover {
  opacity: 0.85;
  text-decoration: underline;
}

.amount-link {
  display: inline-block;
  max-width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  line-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount-link:hover {
  opacity: 0.85;
  text-decoration: underline;
}

.name-input {
  box-sizing: border-box;
  width: 100%;
  max-width: 120px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 12px;
  line-height: 22px;
  text-align: left;
  outline: none;
}

.name-input:focus {
  border-color: var(--color-accent);
}

.cell-editor--name {
  justify-content: center;
}

.link-disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.empty-cell {
  padding: 40px 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.action-links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: center;
  justify-content: center;
}

.link {
  flex-shrink: 0;
  color: var(--color-accent);
  font-size: 12px;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

.link:hover {
  opacity: 0.85;
}

.link-muted {
  color: var(--color-text-secondary);
}

.link-muted:hover {
  color: var(--color-text-regular);
}

.link-danger {
  color: #e85d6a;
}

.link-danger:hover {
  opacity: 0.85;
}

.confirm-text {
  margin: 0 0 8px;
  color: var(--color-text-primary);
  font-size: 14px;
}

.confirm-tip {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.cell-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 24px;
  margin: 0 auto;
}

.date-picker-field {
  width: 108px !important;
  max-width: 108px;
  height: 24px;
  flex-shrink: 0;
  line-height: 24px;
}

.date-picker-field :deep(.el-date-editor.el-input) {
  width: 108px !important;
  max-width: 108px;
  height: 24px !important;
  box-sizing: border-box;
  line-height: 24px;
}

.date-picker-field :deep(.el-input__wrapper) {
  height: 24px !important;
  min-height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.date-picker-field :deep(.el-input__inner) {
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  text-align: center;
}

.date-picker-field :deep(.el-input__prefix),
.date-picker-field :deep(.el-input__suffix) {
  display: none;
}

.amount-input {
  box-sizing: border-box;
  width: 72px;
  max-width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  outline: none;
  flex-shrink: 0;
}

td.col-date>span,
td.col-amount>span {
  display: inline-block;
  line-height: 24px;
}

.amount-input:focus {
  border-color: var(--color-accent);
}

.pagination {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.pagination-total {
  margin-right: auto;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.page-info {
  color: var(--color-text-regular);
  font-size: 14px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

<style>
.author-date-popper {
  z-index: 3000 !important;
}
</style>
