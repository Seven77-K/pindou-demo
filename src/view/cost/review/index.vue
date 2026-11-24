<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <h3>拼豆测评</h3>
        <span class="header-badge">共 {{ filteredReviews.length }} 个品牌</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="goToCost">返回花费</button>
        <button type="button" class="btn-primary" @click="chartsVisible = true">购买分析</button>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-item">
        <span class="summary-label">品牌数</span>
        <span class="summary-value">{{ summary.brandCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">购买次数</span>
        <span class="summary-value">{{ summary.purchaseCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">合计金额</span>
        <span class="summary-value">{{ formatCostAmount(summary.totalAmount) }}</span>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>购买渠道</label>
          <select v-model="filters.channel">
            <option value="">全部渠道</option>
            <option v-for="ch in channelOptions" :key="ch" :value="ch">{{ ch }}</option>
          </select>
        </div>
        <div class="search-item">
          <label>是否回购</label>
          <select v-model="filters.willRepurchase">
            <option value="">全部</option>
            <option value="yes">会</option>
            <option value="no">否</option>
          </select>
        </div>
        <div class="search-item">
          <label>回购色号</label>
          <button
            type="button"
            class="swatch-row filter-color-btn"
            :class="{ empty: !filters.colorCodes.length }"
            :title="filters.colorCodes.length ? `筛选 ${filters.colorCodes.length} 色` : '选择筛选色号'"
            @click="openColorFilter('repurchase')"
          >
            <template v-if="filters.colorCodes.length">
              <i
                v-for="code in filters.colorCodes.slice(0, 6)"
                :key="code"
                class="mini-swatch"
                :style="{ background: getBeadColorHex(code) }"
                :title="code"
              />
              <span v-if="filters.colorCodes.length > 6" class="swatch-more">
                +{{ filters.colorCodes.length - 6 }}
              </span>
              <span class="swatch-count">{{ filters.colorCodes.length }} 色</span>
            </template>
            <span v-else class="muted">全部色号</span>
          </button>
        </div>
        <button type="button" class="btn-search-reset" @click="resetFilters">重置</button>
      </div>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th class="col-index">序号</th>
            <th class="col-brand">品牌</th>
            <th class="col-pack">类别</th>
            <th class="col-channel">购买渠道</th>
            <th class="col-count">购买次数</th>
            <th class="col-amount">金额</th>
            <th class="col-date">最近购买</th>
            <th class="col-will">是否回购</th>
            <th class="col-comment">总体评价</th>
            <th class="col-colors">回购色号</th>
            <th class="col-colors">禁选色号</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in tableRows"
            :key="row.item?.brand ?? `empty-${index}`"
            :class="{ 'row-empty': !row.item }"
          >
            <template v-if="row.item">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ row.item.brand }}</td>
              <td>
                <span
                  v-if="row.item.packTypes.length"
                  class="pack-tag"
                  :class="{
                    full: row.item.packTypes.includes('全套'),
                    refill: row.item.packTypes.includes('补充装') && !row.item.packTypes.includes('全套'),
                  }"
                >
                  {{ row.item.packTypeLabel }}
                </span>
                <span v-else class="muted">—</span>
              </td>
              <td>{{ row.item.channels.length ? row.item.channels.join('、') : '—' }}</td>
              <td>
                <a
                  class="link count-link"
                  :title="`查看 ${row.item.brand} 的 ${row.item.count} 次购买`"
                  @click="openPurchaseHistory(row.item)"
                >{{ row.item.count }}</a>
              </td>
              <td class="amount-cell">{{ formatCostAmount(row.item.amount) }}</td>
              <td>{{ row.item.lastDate || '—' }}</td>
              <td>
                <span
                  class="will-tag"
                  :class="{
                    yes: row.item.willRepurchase !== false,
                    no: row.item.willRepurchase === false,
                  }"
                >
                  {{ willRepurchaseLabel(row.item.willRepurchase) }}
                </span>
              </td>
              <td class="comment-cell" :title="row.item.comment || ''">
                {{ row.item.comment || '—' }}
              </td>
              <td>
                <button
                  type="button"
                  class="swatch-row"
                  :class="{ empty: !row.item.repurchaseColors.length }"
                  :title="row.item.repurchaseColors.length ? row.item.repurchaseColors.join('、') : '选择回购色号'"
                  @click="openColorsView(row.item, 'repurchase')"
                >
                  <template v-if="row.item.repurchaseColors.length">
                    <i
                      v-for="code in row.item.repurchaseColors.slice(0, 8)"
                      :key="code"
                      class="mini-swatch"
                      :style="{ background: getBeadColorHex(code) }"
                      :title="code"
                    />
                    <span
                      v-if="row.item.repurchaseColors.length > 8"
                      class="swatch-more"
                      :title="row.item.repurchaseColors.slice(8).join('、')"
                    >
                      +{{ row.item.repurchaseColors.length - 8 }}
                    </span>
                    <span class="swatch-count" :title="row.item.repurchaseColors.join('、')">
                      {{ row.item.repurchaseColors.length }} 色
                    </span>
                  </template>
                  <span v-else class="muted">未选</span>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="swatch-row"
                  :class="{ empty: !row.item.bannedColors.length }"
                  :title="row.item.bannedColors.length ? row.item.bannedColors.join('、') : '选择禁选色号'"
                  @click="openColorsView(row.item, 'banned')"
                >
                  <template v-if="row.item.bannedColors.length">
                    <i
                      v-for="code in row.item.bannedColors.slice(0, 8)"
                      :key="code"
                      class="mini-swatch"
                      :style="{ background: getBeadColorHex(code) }"
                      :title="code"
                    />
                    <span
                      v-if="row.item.bannedColors.length > 8"
                      class="swatch-more"
                      :title="row.item.bannedColors.slice(8).join('、')"
                    >
                      +{{ row.item.bannedColors.length - 8 }}
                    </span>
                    <span class="swatch-count" :title="row.item.bannedColors.join('、')">
                      {{ row.item.bannedColors.length }} 色
                    </span>
                  </template>
                  <span v-else class="muted">未选</span>
                </button>
              </td>
              <td>
                <a class="link" @click="openEdit(row.item)">编辑</a>
              </td>
            </template>
            <template v-else-if="!filteredReviews.length && index === 0">
              <td colspan="12" class="empty-cell">暂无匹配的品牌记录</td>
            </template>
            <template v-else>
              <td colspan="12">&nbsp;</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ filteredReviews.length }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">尾页</button>
    </div>

    <BrandReviewChartsDialog v-model:visible="chartsVisible" :brand-stats="brandStats" />
    <BrandReviewEditDialog
      v-model:visible="editVisible"
      :brand="editingBrand"
      :review="editingReview"
      @save="handleEditSave"
    />
    <BrandReviewColorsViewDialog
      v-model:visible="colorsViewVisible"
      :brand="colorsViewBrand"
      :selected-colors="colorsViewSelected"
      :filter-mode="colorsDialogMode === 'filter'"
      :color-kind="colorsDialogKind"
      @save="handleColorsSave"
    />
    <BrandPurchaseHistoryDialog
      v-model:visible="purchaseHistoryVisible"
      :brand="purchaseHistoryBrand"
      :purchases="purchaseHistoryList"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loadPatterns } from '@/composables/usePatternData'
import { useBrandReviews } from '@/composables/useBrandReviews'
import { useMessage } from '@/composables/useMessage'
import { useListTablePagination } from '@/composables/useListTablePagination'
import { getBeadColorHex } from '@/constants/beadColors221'
import BrandReviewChartsDialog from '@/view/cost/review/components/BrandReviewChartsDialog.vue'
import BrandReviewEditDialog from '@/view/cost/review/components/BrandReviewEditDialog.vue'
import BrandReviewColorsViewDialog from '@/view/cost/review/components/BrandReviewColorsViewDialog.vue'
import BrandPurchaseHistoryDialog from '@/view/cost/review/components/BrandPurchaseHistoryDialog.vue'

const router = useRouter()
const { showSuccess } = useMessage()
const { brandStats, brandReviews, summary, upsertReview, getBrandPurchases, formatCostAmount } =
  useBrandReviews()
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const chartsVisible = ref(false)
const editVisible = ref(false)
const editingBrand = ref('')
const colorsViewVisible = ref(false)
const colorsViewBrand = ref('')
const colorsViewSelected = ref([])
const colorsDialogMode = ref('edit') // edit | filter
const colorsDialogKind = ref('repurchase') // repurchase | banned
const purchaseHistoryVisible = ref(false)
const purchaseHistoryBrand = ref('')
const purchaseHistoryList = ref([])

const filters = ref({
  channel: '',
  willRepurchase: '',
  colorCodes: [],
})

const channelOptions = computed(() => {
  const set = new Set()
  brandReviews.value.forEach((item) => {
    item.channels.forEach((ch) => {
      if (ch) set.add(ch)
    })
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredReviews = computed(() => {
  const { channel, willRepurchase, colorCodes } = filters.value
  return brandReviews.value.filter((item) => {
    if (channel && !item.channels.includes(channel)) return false
    if (willRepurchase === 'yes' && item.willRepurchase === false) return false
    if (willRepurchase === 'no' && item.willRepurchase !== false) return false
    if (colorCodes.length && !colorCodes.some((code) => item.repurchaseColors.includes(code))) {
      return false
    }
    return true
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredReviews.value.length / pageSize.value)),
)

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredReviews.value.slice(start, start + pageSize.value)
})

const tableRows = computed(() => {
  const rows = pagedList.value.map((item) => ({ item }))
  while (rows.length < pageSize.value) {
    rows.push({ item: null })
  }
  return rows
})

const editingReview = computed(
  () => brandReviews.value.find((item) => item.brand === editingBrand.value) || null,
)

watch(
  filters,
  () => {
    currentPage.value = 1
  },
  { deep: true },
)

watch(filteredReviews, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const resetFilters = () => {
  filters.value = {
    channel: '',
    willRepurchase: '',
    colorCodes: [],
  }
  currentPage.value = 1
}

const willRepurchaseLabel = (value) => (value === false ? '否' : '会')

const openEdit = (item) => {
  editingBrand.value = item.brand
  editVisible.value = true
}

const openPurchaseHistory = (item) => {
  purchaseHistoryBrand.value = item.brand
  purchaseHistoryList.value = getBrandPurchases(item.brand)
  purchaseHistoryVisible.value = true
}

const openColorsView = (item, kind = 'repurchase') => {
  colorsDialogMode.value = 'edit'
  colorsDialogKind.value = kind
  colorsViewBrand.value = item.brand
  colorsViewSelected.value =
    kind === 'banned' ? [...item.bannedColors] : [...item.repurchaseColors]
  colorsViewVisible.value = true
}

const openColorFilter = (kind = 'repurchase') => {
  colorsDialogMode.value = 'filter'
  colorsDialogKind.value = kind
  colorsViewBrand.value = ''
  colorsViewSelected.value = [...filters.value.colorCodes]
  colorsViewVisible.value = true
}

const handleColorsSave = (payload) => {
  const kind = payload.colorKind || colorsDialogKind.value
  const colors = payload.colors || []
  if (colorsDialogMode.value === 'filter') {
    filters.value.colorCodes = [...colors]
    return
  }
  if (kind === 'banned') {
    upsertReview(payload.brand, { bannedColors: colors })
    showSuccess('已保存禁选色号')
    return
  }
  upsertReview(payload.brand, { repurchaseColors: colors })
  showSuccess('已保存回购色号')
}

const handleEditSave = (payload) => {
  upsertReview(payload.brand, payload)
  showSuccess('已保存测评')
}

const goToCost = () => {
  router.push({ name: 'cost' })
}

loadPatterns()
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
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

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.summary-row {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 12px;
}

.summary-item {
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-pale) 0%, #fff 100%);
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.summary-value {
  color: var(--color-accent);
  font-size: 24px;
  font-weight: 700;
}

.search-bar {
  flex-shrink: 0;
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
  gap: 8px;
}

.search-item label {
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.search-item select {
  width: 140px;
  height: 32px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236e5660' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-item select:hover {
  border-color: var(--color-accent);
}

.search-item select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(224, 120, 144, 0.12);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a83858' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
}

.filter-color-btn {
  min-width: 140px;
  max-width: 280px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-color-btn:hover {
  border-color: var(--color-accent);
  background: #fff;
}

.filter-color-btn:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(224, 120, 144, 0.12);
}

.btn-search-reset {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.btn-search-reset:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-secondary,
.btn-primary {
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-accent-deep);
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.data-table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  height: var(--list-table-row-h, 52px);
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 13px;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table th {
  height: var(--list-table-head-h, 38px);
  background: var(--color-pale);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.data-table tbody tr:hover:not(.row-empty) {
  background: #fdf9fb;
}

.row-empty td {
  border-bottom-color: transparent;
}

.col-index { width: 56px; }
.col-brand { width: 12%; }
.col-pack { width: 10%; }
.col-channel { width: 12%; }
.col-count { width: 8%; }
.col-amount { width: 10%; }
.col-date { width: 11%; }
.col-will { width: 7%; }
.col-comment { width: 14%; }
.col-colors { width: 11%; }
.col-action { width: 56px; }

.comment-cell {
  max-width: 0;
  color: var(--color-text-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
}

.muted,
.empty-cell {
  color: var(--color-text-secondary);
}

.empty-cell {
  text-align: center;
}

.pack-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f3eef1;
  color: #6e5660;
  font-size: 12px;
  font-weight: 600;
}

.pack-tag.full {
  background: #fdeef3;
  color: #a83858;
}

.pack-tag.refill {
  background: #eef5f1;
  color: #3d8f66;
}

.will-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  background: #f3eef1;
  color: #8a7480;
  font-size: 12px;
  font-weight: 600;
}

.will-tag.yes {
  background: #e8f6ee;
  color: #3d8f66;
}

.will-tag.no {
  background: #fcecef;
  color: #c45c6a;
}

.swatch-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin: 0;
  padding: 2px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.swatch-row:hover {
  background: rgba(224, 120, 144, 0.08);
}

.mini-swatch {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  flex-shrink: 0;
}

.swatch-more,
.swatch-count {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.link {
  color: var(--color-accent);
  cursor: pointer;
  user-select: none;
}

.link:hover {
  text-decoration: underline;
}

.count-link {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.pagination {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.pagination-total {
  margin-right: auto;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.page-btn {
  min-width: 56px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-info {
  min-width: 72px;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 720px) {
  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
