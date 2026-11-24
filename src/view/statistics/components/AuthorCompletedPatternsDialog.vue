<template>
  <Teleport v-if="visible" to="body">
    <div
      class="dialog-mask"
      :style="{ zIndex: overlayZIndex }"
      @click="handleClose"
    >
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ displayTitle }}</h4>
            <p class="header-sub">
              共 {{ filteredPatterns.length }} 张{{ listHint }}
              <span v-if="showAmount">，合计 {{ formatCostAmount(totalAmount) }}</span>
              <span v-if="hasActiveFilter" class="header-sub-muted">
                （筛选自 {{ patterns.length }} 张）
              </span>
            </p>
            <div v-if="showAmount" class="type-summary">
              <span
                v-for="item in typeSummaries"
                :key="item.key"
                class="type-summary-pill"
                :class="`is-${item.key}`"
              >
                {{ item.label }} {{ item.count }} 张
                <em>{{ formatCostAmount(item.amount) }}</em>
              </span>
            </div>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-filters">
          <label class="filter-item">
            <span class="filter-label">类型</span>
            <select v-model="filterType" class="filter-select">
              <option value="">全部</option>
              <option v-for="opt in patternTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <label v-if="showBuyer" class="filter-item">
            <span class="filter-label">购买人</span>
            <select v-model="filterBuyer" class="filter-select">
              <option value="">全部</option>
              <option v-for="buyer in buyerFilterOptions" :key="buyer" :value="buyer">
                {{ buyer }}
              </option>
            </select>
          </label>
          <button
            v-if="hasActiveFilter"
            type="button"
            class="filter-reset"
            @click="resetFilters"
          >
            清除筛选
          </button>
        </div>

        <div class="dialog-body">
          <div v-if="filteredPatterns.length" class="list-panel" ref="tableWrapRef">
            <table class="data-table" :style="tableStyle">
              <colgroup v-if="showAuthor && showBuyer">
                <col style="width: 5%" />
                <col style="width: 8%" />
                <col style="width: 16%" />
                <col style="width: 11%" />
                <col style="width: 10%" />
                <col style="width: 8%" />
                <col style="width: 9%" />
                <col style="width: 16%" />
                <col style="width: 17%" />
              </colgroup>
              <colgroup v-else-if="showAuthor">
                <col style="width: 5%" />
                <col style="width: 9%" />
                <col style="width: 20%" />
                <col style="width: 12%" />
                <col style="width: 12%" />
                <col style="width: 10%" />
                <col style="width: 16%" />
                <col style="width: 16%" />
              </colgroup>
              <colgroup v-else-if="showBuyer">
                <col style="width: 6%" />
                <col style="width: 9%" />
                <col style="width: 22%" />
                <col style="width: 11%" />
                <col style="width: 10%" />
                <col style="width: 10%" />
                <col style="width: 16%" />
                <col style="width: 16%" />
              </colgroup>
              <colgroup v-else>
                <col style="width: 7%" />
                <col style="width: 10%" />
                <col style="width: 28%" />
                <col style="width: 13%" />
                <col style="width: 12%" />
                <col style="width: 15%" />
                <col style="width: 15%" />
              </colgroup>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>图纸图片</th>
                  <th>图纸名称</th>
                  <th v-if="showAuthor">图纸作者</th>
                  <th>规格</th>
                  <th>类型</th>
                  <th v-if="showBuyer">购买人</th>
                  <th v-if="showAmount">金额</th>
                  <th>图纸日期</th>
                  <th>完成日期</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in tableRows"
                  :key="row.item?.id || `row-${(currentPage - 1) * pageSize + index}`"
                  :class="{ 'row-empty': !row.item }"
                >
                  <template v-if="row.item">
                    <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                    <td>
                      <span class="pattern-thumb-wrap">
                        <img
                          v-if="displayImage(row.item)"
                          class="pattern-thumb"
                          :src="displayImage(row.item)"
                          :alt="row.item.name"
                          @click="openPreview(row.item)"
                        />
                        <span v-else-if="hasPatternImageFlag(row.item)" class="pattern-thumb-placeholder">加载中</span>
                        <span v-else class="pattern-thumb-placeholder">无图</span>
                      </span>
                    </td>
                    <td :title="row.item.name || ''">{{ row.item.name || '—' }}</td>
                    <td v-if="showAuthor" :title="row.item.author || ''">{{ row.item.author || '—' }}</td>
                    <td :title="row.item.size || ''">{{ row.item.size || '—' }}</td>
                    <td>{{ typeLabel(row.item.type) }}</td>
                    <td v-if="showBuyer" :title="row.item.buyer || ''">{{ row.item.buyer || '—' }}</td>
                    <td v-if="showAmount">{{ formatAmount(row.item.valueAmount) }}</td>
                    <td>{{ row.item.date || '—' }}</td>
                    <td>{{ formatCompletedDate(row.item) }}</td>
                  </template>
                  <template v-else>
                    <td v-for="col in columnCount" :key="col">&nbsp;</td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-text">
            {{ patterns.length ? '没有符合筛选条件的图纸' : `暂无${listHint}` }}
          </p>

          <div v-if="filteredPatterns.length" class="pagination">
            <span class="pagination-total">共 {{ filteredPatterns.length }} 条</span>
            <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">
              首页
            </button>
            <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">
              上一页
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button
              type="button"
              class="page-btn"
              :disabled="currentPage >= totalPages"
              @click="currentPage += 1"
            >
              下一页
            </button>
            <button
              type="button"
              class="page-btn"
              :disabled="currentPage >= totalPages"
              @click="currentPage = totalPages"
            >
              尾页
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <PatternPreviewDialog
    v-model:visible="previewVisible"
    :name="preview?.name"
    :image="preview?.image"
  />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  buyerOptions,
  getPatternImage,
  hasPatternImageFlag,
  loadPatternImage,
  loadPatternImages,
  patternTypeLabels,
  patternTypeOptions,
} from '@/composables/usePatternData'
import { formatCostAmount } from '@/composables/useCostData'
import { normalizeAuthorAmount } from '@/composables/useAuthorAmounts'
import { useListTablePagination } from '@/composables/useListTablePagination'
import { createSafeResizeObserver } from '@/utils/safeResizeObserver'
import PatternPreviewDialog from '@/view/pattern/components/PatternPreviewDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  author: { type: String, default: '' },
  title: { type: String, default: '' },
  patterns: { type: Array, default: () => [] },
  listHint: { type: String, default: '已完成图纸' },
  showBuyer: { type: Boolean, default: true },
  showAuthor: { type: Boolean, default: false },
  showAmount: { type: Boolean, default: false },
  patternCategory: { type: String, default: 'member' },
  /** 嵌套弹层时提高，避免被父弹窗遮住 */
  overlayZIndex: { type: Number, default: 2000 },
})

const emit = defineEmits(['update:visible'])

const { tableWrapRef, pageSize, currentPage, tableStyle, recalcPageSize } = useListTablePagination()

const filterType = ref('')
const filterBuyer = ref('')

const displayTitle = computed(
  () => props.title || (props.author ? `${props.author} · 已拼完列表` : '已拼完列表'),
)

const preview = ref(null)
let resizeObserver = null

const buyerFilterOptions = computed(() => {
  const set = new Set(buyerOptions)
  props.patterns.forEach((item) => {
    const buyer = String(item?.buyer || '').trim()
    if (buyer) set.add(buyer)
  })
  return [...set]
})

const hasActiveFilter = computed(() => Boolean(filterType.value || filterBuyer.value))

const filteredPatterns = computed(() => {
  return props.patterns.filter((item) => {
    if (filterType.value && item.type !== filterType.value) return false
    if (filterBuyer.value) {
      const buyer = String(item?.buyer || '').trim()
      if (buyer !== filterBuyer.value) return false
    }
    return true
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredPatterns.value.length / pageSize.value)),
)

const patternsKey = computed(() =>
  props.patterns.map((item) => item?.id ?? '').join('|'),
)

const pagedPatterns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredPatterns.value.slice(start, start + pageSize.value)
})

const columnCount = computed(() => {
  let count = 7
  if (props.showAuthor) count += 1
  if (props.showBuyer) count += 1
  if (props.showAmount) count += 1
  return count
})

const totalAmount = computed(() =>
  filteredPatterns.value.reduce(
    (sum, item) => sum + normalizeAuthorAmount(item.valueAmount),
    0,
  ),
)

const typeSummaries = computed(() => {
  const buckets = {
    member: { key: 'member', label: '会员图纸', count: 0, amount: 0 },
    paid: { key: 'paid', label: '付费图纸', count: 0, amount: 0 },
    free: { key: 'free', label: '免费图纸', count: 0, amount: 0 },
  }
  filteredPatterns.value.forEach((item) => {
    const key = item?.type === 'paid' ? 'paid' : item?.type === 'member' ? 'member' : 'free'
    buckets[key].count += 1
    buckets[key].amount += normalizeAuthorAmount(item.valueAmount)
  })
  return [buckets.member, buckets.paid, buckets.free]
})

const tableRows = computed(() => {
  const rows = pagedPatterns.value.map((item) => ({ item }))
  while (rows.length < pageSize.value) {
    rows.push({ item: null })
  }
  return rows
})

const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (visible) => {
    if (!visible) preview.value = null
  },
})

const typeLabel = (type) => patternTypeLabels[type] || type || '—'

const formatCompletedDate = (item) => {
  const date = String(item?.completedDate || '').trim().slice(0, 10)
  return date || '—'
}

const formatAmount = (value) => {
  const amount = normalizeAuthorAmount(value)
  return amount > 0 ? formatCostAmount(amount) : '—'
}

const displayImage = (item) => getPatternImage(item)

const resolveCategory = (item) => item?._category || props.patternCategory || ''

const resetFilters = () => {
  filterType.value = ''
  filterBuyer.value = ''
}

const loadImages = async () => {
  const items = pagedPatterns.value.filter((item) => item.hasImage && !displayImage(item))
  if (!items.length) return
  const byCategory = new Map()
  items.forEach((item) => {
    const cat = resolveCategory(item)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat).push(item)
  })
  await Promise.all(
    [...byCategory.entries()].map(([cat, list]) => loadPatternImages(list, cat || undefined)),
  )
}

const setupPaginationObserver = () => {
  resizeObserver?.disconnect()
  if (!tableWrapRef.value) return
  resizeObserver = createSafeResizeObserver(() => recalcPageSize())
  resizeObserver.observe(tableWrapRef.value)
}

const handleClose = () => {
  preview.value = null
  emit('update:visible', false)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      resizeObserver?.disconnect()
      resizeObserver = null
      return
    }

    resetFilters()
    currentPage.value = 1
    await nextTick()
    requestAnimationFrame(() => {
      recalcPageSize()
      setupPaginationObserver()
      loadImages()
    })
  },
)

watch(
  patternsKey,
  () => {
    if (props.visible) currentPage.value = 1
  },
)

watch([filterType, filterBuyer], async () => {
  currentPage.value = 1
  await nextTick()
  if (props.visible && filteredPatterns.value.length) {
    requestAnimationFrame(() => {
      recalcPageSize()
      setupPaginationObserver()
      loadImages()
    })
  }
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

watch(currentPage, () => {
  if (props.visible) loadImages()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const openPreview = async (item) => {
  let image = displayImage(item)
  if (!image && item.hasImage) {
    image = await loadPatternImage(item.id, resolveCategory(item))
  }
  if (!image) return

  preview.value = {
    name: item.name,
    image,
  }
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(36, 24, 32, 0.42);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(940px, 100%);
  height: min(88vh, 680px);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(82, 64, 74, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 12px;
}

.header-text h4 {
  margin: 0;
  color: #3d2f38;
  font-size: 18px;
  font-weight: 600;
}

.header-sub {
  margin: 6px 0 0;
  color: #9a8a92;
  font-size: 12px;
}

.header-sub-muted {
  color: #c4b4bc;
}

.type-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.type-summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.type-summary-pill em {
  font-style: normal;
  font-weight: 700;
}

.type-summary-pill.is-member {
  background: #f3ebff;
  color: #9333ea;
}

.type-summary-pill.is-paid {
  background: #fff0f2;
  color: #e85d6a;
}

.type-summary-pill.is-free {
  background: #e8faf7;
  color: #2db5a8;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #9a8a92;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: #faf5f7;
  color: #6e5660;
}

.dialog-filters {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 0 24px 12px;
  border-bottom: 1px solid #f0e4ea;
}

.filter-item {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.filter-label {
  color: #8a7a82;
  font-size: 12px;
  white-space: nowrap;
}

.filter-select {
  min-width: 96px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #eadde4;
  border-radius: 8px;
  background: #fffafb;
  color: #52404a;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:hover,
.filter-select:focus {
  border-color: #e8c0cc;
}

.filter-reset {
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #e891a8;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.filter-reset:hover {
  background: #fdf5f8;
}

.dialog-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 16px 24px 18px;
  overflow: hidden;
}

.list-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #f0e4ea;
  border-radius: 10px;
  background: #fff;
}

.data-table {
  width: 100%;
  height: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  box-sizing: border-box;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  text-align: center;
  border-bottom: 1px solid #f0e4ea;
}

.data-table thead th {
  height: var(--list-table-head-h, 38px);
  max-height: var(--list-table-head-h, 38px);
  color: #6e5660;
  font-weight: 600;
  background: #faf7f9;
}

.data-table tbody tr {
  height: var(--list-table-row-h, 52px);
  max-height: var(--list-table-row-h, 52px);
}

.data-table tbody td {
  height: var(--list-table-row-h, 52px);
  max-height: var(--list-table-row-h, 52px);
  color: #52404a;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover:not(.row-empty) {
  background: #fff9fb;
}

.data-table tbody tr.row-empty td {
  border-bottom: 1px solid #f0e4ea;
}

.pattern-thumb-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  vertical-align: middle;
}

.pattern-thumb {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #f0e4ea;
  cursor: zoom-in;
}

.pattern-thumb-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: #faf7f9;
  border: 1px dashed #eadde4;
  color: #b8a8b0;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
}

.empty-text {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: #9a8a92;
  font-size: 14px;
}

.pagination {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0e4ea;
}

.pagination-total {
  margin-right: auto;
  color: #9a8a92;
  font-size: 13px;
}

.page-info {
  color: #52404a;
  font-size: 13px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid #eadde4;
  border-radius: 6px;
  background: #fff;
  color: #52404a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: #d8c4cc;
  background: #faf5f7;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
