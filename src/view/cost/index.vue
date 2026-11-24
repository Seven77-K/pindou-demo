<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <h3>拼豆花费</h3>
        <span class="header-badge">共 {{ filteredExpenses.length }} 条记录</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="goToReview">拼豆测评</button>
        <button type="button" class="btn-secondary" @click="goToStatistics">数据统计</button>
        <button type="button" class="btn-primary" @click="openCreate">记一笔</button>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-item">
        <span class="summary-label">本月总花费{{ summaryScopeSuffix }}</span>
        <span class="summary-value">{{ formatCostAmount(expenseTotals.month) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">本年总花费{{ summaryScopeSuffix }}</span>
        <span class="summary-value">{{ formatCostAmount(expenseTotals.year) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">总计花费{{ summaryScopeSuffix }}</span>
        <span class="summary-value">{{ formatCostAmount(expenseTotals.all) }}</span>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>类别</label>
          <select v-model="searchForm.category">
            <option value="">全部类别</option>
            <option v-for="cat in expenseCategoryOptions" :key="cat" :value="cat">
              {{ displayCostCategory(cat) }}
            </option>
          </select>
        </div>
        <div v-if="searchForm.category" class="search-item">
          <label>品牌</label>
          <select v-model="searchForm.brand">
            <option value="">全部品牌</option>
            <option v-for="opt in searchBrandOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="search-item search-item-date">
          <label>日期</label>
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            clearable
            class="search-date-range"
          />
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">重置</button>
      </div>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <colgroup>
          <col class="col-index" />
          <col class="col-date" />
          <col class="col-category" />
          <col class="col-spec" />
          <col class="col-brand" />
          <col class="col-channel" />
          <col class="col-amount" />
          <col class="col-note" />
          <col class="col-action" />
        </colgroup>
        <thead>
          <tr>
            <th class="col-index">序号</th>
            <th class="col-date">日期</th>
            <th class="col-category">项目类别</th>
            <th class="col-spec">规格</th>
            <th class="col-brand">品牌</th>
            <th class="col-channel">购买渠道</th>
            <th class="col-amount">金额</th>
            <th class="col-note">备注</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in tableRows"
            :key="row.item?.id ?? `empty-${index}`"
            :class="{ 'row-empty': !row.item }"
          >
            <template v-if="row.item">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ row.item.date || '—' }}</td>
              <td>{{ displayCostCategory(row.item.category) }}</td>
              <td>{{ row.item.spec || '—' }}</td>
              <td>{{ row.item.brand || '—' }}</td>
              <td>{{ row.item.channel || '—' }}</td>
              <td class="col-amount">{{ formatCostAmount(row.item.amount) }}</td>
              <td class="col-note">{{ displayExpenseNote(row.item) }}</td>
              <td>
                <span class="action-links">
                  <template v-if="isManualExpense(row.item)">
                    <a class="link" @click="openEdit(row.item)">编辑</a>
                    <a class="link link-danger" @click="openDelete(row.item)">删除</a>
                  </template>
                  <a v-else class="link" @click="openView(row.item)">查看</a>
                </span>
              </td>
            </template>
            <template v-else-if="!filteredExpenses.length && index === 0">
              <td colspan="9" class="empty-cell">暂无花费记录</td>
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
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ filteredExpenses.length }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">尾页</button>
    </div>

    <Teleport to="body">
      <div v-if="formVisible" class="form-dialog-mask" @click="closeForm">
        <div class="form-dialog-box" :class="{ 'form-dialog-box--wide': showRefillPicker }" @click.stop>
          <div class="form-dialog-header">
            <div class="form-header-text">
              <span :class="['view-category-tag', formCategoryTagClass]">{{ form.category }}</span>
              <h4>{{ dialogMode === 'edit' ? '编辑花费' : '记一笔' }}</h4>
              <p class="form-header-sub">记录拼豆相关花费</p>
            </div>
            <button type="button" class="form-dialog-close" :disabled="saving" @click="closeForm">×</button>
          </div>

          <form class="form-dialog-body" @submit.prevent="handleSubmit">
            <div class="form-grid">
              <div class="form-item form-span-2">
                <label class="label-required">日期</label>
                <el-date-picker
                  v-model="form.date"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  popper-class="dialog-field-popper"
                  clearable
                  class="field-full"
                />
              </div>

              <div class="form-item">
                <label class="label-required">项目类别</label>
                <select v-model="form.category" class="form-select">
                  <option v-for="opt in MANUAL_EXPENSE_CATEGORY_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
              </div>

              <div v-if="form.category === '拼豆'" class="form-item">
                <label class="label-required">规格</label>
                <select v-model="form.spec" class="form-select">
                  <option value="">请选择规格</option>
                  <option v-for="opt in MANUAL_BEAD_SPEC_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
              </div>

              <div class="form-item">
                <label>品牌</label>
                <FieldCombobox v-model="form.brand" :options="brandOptions" placeholder="请选择或输入品牌" />
              </div>

              <div class="form-item">
                <label>购买渠道</label>
                <FieldCombobox v-model="form.channel" :options="channelOptions" placeholder="请选择或输入购买渠道" />
              </div>

              <div class="form-item form-span-2">
                <label class="label-required">金额</label>
                <el-input-number
                  v-model="form.amount"
                  :min="0"
                  :max="999999"
                  :precision="2"
                  :step="0.01"
                  :step-strictly="false"
                  controls-position="right"
                  placeholder="0.00"
                  class="field-full"
                />
              </div>

              <div class="form-item form-span-2">
                <label>备注</label>
                <el-input
                  v-model="form.note"
                  type="textarea"
                  :rows="3"
                  :placeholder="notePlaceholder"
                  resize="none"
                  @input="syncRefillFromNote"
                />
              </div>
            </div>

            <div v-if="showRefillPicker" class="refill-section">
              <div class="refill-head">
                <h5>补充装色卡</h5>
                <p>按色号系列点选，下方表格填写重量</p>
              </div>

              <div class="series-tabs">
                <button
                  v-for="group in BEAD_COLOR_SERIES"
                  :key="group.letter"
                  type="button"
                  class="series-tab"
                  :class="{ active: activeSeries === group.letter }"
                  @click="activeSeries = group.letter"
                >
                  {{ group.letter }}
                </button>
              </div>
              <p class="series-name">{{ activeSeriesLabel }}</p>

              <div class="refill-color-grid">
                <button
                  v-for="color in activeSeriesColors"
                  :key="color.code"
                  type="button"
                  class="color-tile"
                  :class="{ selected: selectedRefillCodeSet.has(color.code) }"
                  :style="{ background: color.hex, color: getBeadColorLabelColor(color.hex) }"
                  :title="color.code"
                  @click="toggleRefillColor(color.code)"
                >
                  <span class="code">{{ color.code }}</span>
                  <span v-if="selectedRefillCodeSet.has(color.code)" class="check">✓</span>
                </button>
              </div>

              <div class="refill-table-wrap">
                <table class="refill-table">
                  <thead>
                    <tr>
                      <th style="width: 56px">序号</th>
                      <th style="width: 72px">色号</th>
                      <th style="width: 52px">色块</th>
                      <th>重量（备注）</th>
                      <th style="width: 64px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in form.refillItems" :key="row.code">
                      <td>{{ index + 1 }}</td>
                      <td class="refill-code">{{ row.code }}</td>
                      <td>
                        <span
                          class="refill-swatch"
                          :style="{ background: getBeadColorHex(row.code) }"
                        />
                      </td>
                      <td>
                        <div class="refill-weight-cell">
                          <input
                            v-model="row.weight"
                            type="text"
                            class="refill-weight-input"
                            placeholder="如 50g"
                            @input="syncNoteFromRefill"
                          />
                          <div class="refill-weight-presets">
                            <button
                              v-for="grams in REFILL_WEIGHT_PRESETS"
                              :key="grams"
                              type="button"
                              class="refill-weight-chip"
                              @click="addRefillWeight(row, grams)"
                            >
                              {{ grams }}g
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button type="button" class="refill-remove" @click="removeRefillColor(row.code)">
                          删除
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!form.refillItems.length">
                      <td colspan="5" class="refill-empty">点击上方色号添加到表格</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="form-dialog-footer">
              <button type="button" class="btn-form-cancel" :disabled="saving" @click="closeForm">取消</button>
              <button type="submit" class="btn-form-primary" :disabled="saving">
                {{ saving ? '保存中…' : '确定' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="viewVisible && viewTarget" class="view-dialog-mask" @click="closeView">
        <div class="view-dialog-box" @click.stop>
          <div class="view-dialog-header">
            <div class="view-header-text">
              <span :class="['view-category-tag', viewCategoryTagClass]">
                {{ displayCostCategory(viewTarget.category) }}
              </span>
              <h4>花费详情</h4>
              <p class="view-header-sub">关联数据只读，如需修改请前往来源页面</p>
            </div>
            <button type="button" class="view-dialog-close" @click="closeView">×</button>
          </div>

          <div class="view-dialog-body">
            <div class="view-amount-card">
              <span class="view-amount-label">花费金额</span>
              <span class="view-amount-value">{{ formatCostAmount(viewTarget.amount) }}</span>
            </div>

            <div class="view-info-grid">
              <div class="view-info-item">
                <span class="view-info-label">日期</span>
                <span class="view-info-value">{{ viewTarget.date || '—' }}</span>
              </div>
              <div class="view-info-item">
                <span class="view-info-label">项目类别</span>
                <span class="view-info-value">{{ displayCostCategory(viewTarget.category) || '—' }}</span>
              </div>
              <div class="view-info-item">
                <span class="view-info-label">规格</span>
                <span class="view-info-value">{{ viewTarget.spec || '—' }}</span>
              </div>
              <div class="view-info-item">
                <span class="view-info-label">购买渠道</span>
                <span class="view-info-value">{{ viewTarget.channel || '—' }}</span>
              </div>
              <div v-if="viewTarget.brand" class="view-info-item">
                <span class="view-info-label">品牌</span>
                <span class="view-info-value">{{ viewTarget.brand }}</span>
              </div>
              <div class="view-info-item">
                <span class="view-info-label">数据来源</span>
                <span class="view-info-value">{{ viewSourceLabel }}</span>
              </div>
            </div>

            <div class="view-note-block">
              <span class="view-info-label">备注</span>
              <p class="view-note-text">{{ displayExpenseNote(viewTarget) }}</p>
            </div>

            <div
              v-if="viewTarget.spec === '补充装' && viewTarget.refillItems?.length"
              class="view-refill-block"
            >
              <span class="view-info-label">补充装色号</span>
              <table class="refill-table view-refill-table">
                <thead>
                  <tr>
                    <th>色号</th>
                    <th>色块</th>
                    <th>重量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in viewTarget.refillItems" :key="row.code">
                    <td class="refill-code">{{ row.code }}</td>
                    <td>
                      <span
                        class="refill-swatch"
                        :style="{ background: getBeadColorHex(row.code) }"
                      />
                    </td>
                    <td>{{ row.weight || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="viewHint" class="view-source-tip">
              <span class="view-tip-icon">i</span>
              <p>{{ viewHint }}</p>
            </div>
          </div>

          <div class="view-dialog-footer">
            <button v-if="viewSourceRoute" type="button" class="btn-view-source" @click="goToSource">
              前往来源页面
            </button>
            <button type="button" class="btn-view-close" @click="closeView">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <el-dialog draggable v-model="deleteVisible" title="确认删除" width="400px">
      <p class="confirm-text">确定删除这条花费记录吗？</p>
      <p v-if="deleteTarget?.source === 'pattern'" class="confirm-tip">普通图纸将清除价格，不会删除图纸本身。</p>
      <p v-else-if="deleteTarget?.source === 'pen'" class="confirm-tip">拼豆笔将清除价格，不会删除豆笔本身。</p>
      <p v-else-if="deleteTarget?.source === 'scoop'" class="confirm-tip">拼豆铲将清除价格，不会删除豆铲本身。</p>
      <p v-else-if="deleteTarget?.source === 'other'" class="confirm-tip">其他工具将清除价格，不会删除工具本身。</p>
      <p v-else-if="deleteTarget?.source === 'tool'" class="confirm-tip">将同时删除拼豆板记录。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatCostAmount, formatRefillNote, parseRefillNoteToItems, MANUAL_BEAD_SPEC_OPTIONS, MANUAL_EXPENSE_CATEGORY_OPTIONS, sumExpenseTotals, useCostData } from '@/composables/useCostData'
import { useBrandReviews } from '@/composables/useBrandReviews'
import { loadPatterns } from '@/composables/usePatternData'
import { useMessage } from '@/composables/useMessage'
import { useListTablePagination } from '@/composables/useListTablePagination'
import FieldCombobox from '@/components/FieldCombobox.vue'
import {
  BEAD_COLOR_SERIES,
  getBeadColorHex,
  getBeadColorLabelColor,
  normalizeBeadColorCode,
} from '@/constants/beadColors221'

const router = useRouter()
const { showSuccess, showError } = useMessage()
const {
  linkedExpenses,
  getExpenseFormData,
  addManualExpense,
  updateExpense,
  removeExpense,
} = useCostData()
const { noRepurchaseBrandSet } = useBrandReviews()

const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()
const formVisible = ref(false)
const viewVisible = ref(false)
const deleteVisible = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const deleting = ref(false)
const editingRow = ref(null)
const viewTarget = ref(null)
const deleteTarget = ref(null)

const searchForm = ref({
  category: '',
  brand: '',
  dateRange: null,
})

const displayCostCategory = (category) => (category === '会员图纸' ? '会员' : category)

const isManualExpense = (item) => item?.source === 'manual'

const expenseCategoryOptions = computed(() => {
  const set = new Set()
  linkedExpenses.value.forEach((row) => {
    if (row.category) set.add(row.category)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const searchBrandOptions = computed(() => {
  const category = searchForm.value.category
  if (!category) return []
  const set = new Set()
  linkedExpenses.value
    .filter((row) => row.category === category)
    .forEach((row) => {
      const brand = String(row.brand || '').trim()
      if (brand) set.add(brand)
    })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredExpenses = computed(() => {
  const { category, brand, dateRange } = searchForm.value
  const [dateStart, dateEnd] = Array.isArray(dateRange) ? dateRange : []
  return linkedExpenses.value.filter((row) => {
    if (category && row.category !== category) return false
    if (brand && (row.brand || '').trim() !== brand) return false
    const date = String(row.date || '').trim().slice(0, 10)
    if (dateStart && (!date || date < dateStart)) return false
    if (dateEnd && (!date || date > dateEnd)) return false
    return true
  })
})

const summaryScopeSuffix = computed(() => {
  const { category, brand, dateRange } = searchForm.value
  const parts = []
  if (category) parts.push(displayCostCategory(category))
  if (brand) parts.push(brand)
  const [dateStart, dateEnd] = Array.isArray(dateRange) ? dateRange : []
  if (dateStart && dateEnd) parts.push(`${dateStart} ~ ${dateEnd}`)
  else if (dateStart) parts.push(`${dateStart} 起`)
  else if (dateEnd) parts.push(`${dateEnd} 止`)
  return parts.length ? ` · ${parts.join(' · ')}` : ''
})

const expenseTotals = computed(() => sumExpenseTotals(filteredExpenses.value))

const buildManualFieldOptions = (field, category = '') => {
  const categoryKey = String(category || '').trim()
  const set = new Set()
  linkedExpenses.value
    .filter((row) => row.source === 'manual')
    .forEach((row) => {
      const rowCategory = String(row.category || '拼豆').trim() || '拼豆'
      if (categoryKey && rowCategory !== categoryKey) return
      const value = String(row[field] || '').trim()
      if (value) set.add(value)
    })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const resetSearch = () => {
  searchForm.value = {
    category: '',
    brand: '',
    dateRange: null,
  }
  currentPage.value = 1
}

watch(
  () => searchForm.value.category,
  () => {
    searchForm.value.brand = ''
    currentPage.value = 1
  },
)

watch(
  () => searchForm.value.brand,
  () => {
    currentPage.value = 1
  },
)

watch(
  () => searchForm.value.dateRange,
  () => {
    currentPage.value = 1
  },
  { deep: true },
)

const viewHint = computed(() => {
  const source = viewTarget.value?.source
  if (source === 'tool') return '该记录来自拼豆板，请在拼豆板页面修改。'
  if (source === 'pen') return '该记录来自拼豆笔，请在拼豆笔页面修改。'
  if (source === 'scoop') return '该记录来自拼豆铲，请在拼豆铲页面修改。'
  if (source === 'other') return '该记录来自其他工具，请在拼豆工具其他页面修改。'
  if (source === 'pattern') return '该记录来自普通图纸，请在图纸页面修改。'
  if (source === 'author') return '该记录来自会员，请在图纸作者页修改。'
  return ''
})

const viewSourceLabel = computed(() => {
  const source = viewTarget.value?.source
  if (source === 'tool') return '拼豆板'
  if (source === 'pen') return '拼豆笔'
  if (source === 'scoop') return '拼豆铲'
  if (source === 'other') return '其他'
  if (source === 'pattern') return '普通图纸'
  if (source === 'author') return '会员'
  return '手动记录'
})

const viewCategoryTagClass = computed(() => {
  const category = viewTarget.value?.category
  const source = viewTarget.value?.source
  if (source === 'other') return 'tag-other'
  if (category === '拼豆板') return 'tag-board'
  if (category === '拼豆笔') return 'tag-pen'
  if (category === '拼豆铲') return 'tag-scoop'
  if (category === '其他') return 'tag-other'
  if (category === '普通图纸') return 'tag-pattern'
  if (category === '会员图纸') return 'tag-member'
  if (category === '拼豆') return 'tag-bead'
  if (category === '工具会员') return 'tag-tool-member'
  return 'tag-default'
})

const formCategoryTagClass = computed(() => {
  const category = form.value.category
  if (category === '工具会员') return 'tag-tool-member'
  return 'tag-bead'
})

const viewSourceRoute = computed(() => {
  const row = viewTarget.value
  if (!row?.source || row.source === 'manual') return null
  if (row.source === 'tool') {
    return { name: 'tools-board', params: { size: row.sizeSlug || 'all' } }
  }
  if (row.source === 'pen') return { name: 'tools-pen' }
  if (row.source === 'scoop') return { name: 'tools-scoop' }
  if (row.source === 'other') return { name: 'tools-other' }
  if (row.source === 'pattern') return { name: 'pattern', query: { tab: 'normal' } }
  if (row.source === 'author') return { name: 'author' }
  return null
})

const form = ref({
  date: '',
  category: '拼豆',
  spec: '',
  brand: '',
  channel: '',
  amount: null,
  note: '',
  refillItems: [],
})

const activeSeries = ref('A')

const showRefillPicker = computed(
  () => form.value.category === '拼豆' && form.value.spec === '补充装',
)

const notePlaceholder = computed(() =>
  showRefillPicker.value
    ? '可手动输入色号，如「H6 100g」「一斤H6、E16半斤」，或点选下方色卡'
    : '选填，可记录店铺、链接等信息',
)

const activeSeriesLabel = computed(() => {
  const group = BEAD_COLOR_SERIES.find((item) => item.letter === activeSeries.value)
  return group ? `${group.letter} · ${group.name}` : ''
})

const activeSeriesColors = computed(() => {
  const group = BEAD_COLOR_SERIES.find((item) => item.letter === activeSeries.value)
  return group?.colors || []
})

const selectedRefillCodeSet = computed(
  () => new Set((form.value.refillItems || []).map((item) => item.code)),
)

const REFILL_WEIGHT_PRESETS = [10, 30, 100, 125, 250, 500]

const parseWeightGrams = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return 0
  if (text.includes('半斤')) return 250
  const jinMatch = text.match(/([一二两三四五六七八九十\d.]*)\s*斤/)
  if (jinMatch) {
    const token = String(jinMatch[1] || '').trim()
    const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    const count = token
      ? (/^\d+(\.\d+)?$/.test(token) ? Number(token) : map[token] || 1)
      : 1
    return Math.round(count * 500)
  }
  const gramMatch = text.match(/(\d+(?:\.\d+)?)\s*g/i)
  if (gramMatch) return Number(gramMatch[1])
  const plain = text.match(/^(\d+(?:\.\d+)?)$/)
  if (plain) return Number(plain[1])
  return 0
}

const addRefillWeight = (row, grams) => {
  if (!row || !Number.isFinite(grams) || grams <= 0) return
  const next = Math.round((parseWeightGrams(row.weight) + grams) * 100) / 100
  row.weight = `${next}g`
  syncNoteFromRefill()
}

const displayExpenseNote = (item) => {
  if (String(item?.spec || '').trim() === '补充装' && item?.refillItems?.length) {
    const refillNote = formatRefillNote(item.refillItems)
    if (refillNote) return refillNote
  }
  const note = String(item?.note || '').trim()
  return note || '—'
}

const syncNoteFromRefill = () => {
  if (!showRefillPicker.value) return
  form.value.note = formatRefillNote(form.value.refillItems)
}

/** 从备注文本识别色号/重量，回填补充装表格 */
const syncRefillFromNote = () => {
  if (!showRefillPicker.value) return
  const note = String(form.value.note || '').trim()
  if (!note) return
  const parsed = parseRefillNoteToItems(note)
  if (!parsed.length) return
  const prevWeight = new Map(
    (form.value.refillItems || []).map((item) => [item.code, item.weight || '']),
  )
  form.value.refillItems = parsed.map(({ code, weight }) => ({
    code,
    weight: weight || prevWeight.get(code) || '',
  }))
}

const toggleRefillColor = (rawCode) => {
  const code = normalizeBeadColorCode(rawCode)
  if (!code) return
  const list = form.value.refillItems || []
  const index = list.findIndex((item) => item.code === code)
  if (index >= 0) {
    list.splice(index, 1)
  } else {
    list.push({ code, weight: '' })
  }
  syncNoteFromRefill()
}

const removeRefillColor = (rawCode) => {
  const code = normalizeBeadColorCode(rawCode)
  form.value.refillItems = (form.value.refillItems || []).filter((item) => item.code !== code)
  syncNoteFromRefill()
}

const isBeadCategory = (category) => String(category || '').trim() === '拼豆'

const brandOptions = computed(() => {
  const category = form.value.category || '拼豆'
  const blocked = isBeadCategory(category) ? noRepurchaseBrandSet.value : null
  const set = new Set(
    buildManualFieldOptions('brand', category).filter((brand) => !blocked?.has(brand)),
  )
  const current = form.value.brand?.trim()
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const channelOptions = computed(() => {
  const set = new Set(buildManualFieldOptions('channel'))
  const current = form.value.channel?.trim()
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredExpenses.value.length / pageSize.value)),
)

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredExpenses.value.slice(start, start + pageSize.value)
})

const tableRows = computed(() => {
  const rows = pagedList.value.map((item) => ({ item }))
  while (rows.length < pageSize.value) {
    rows.push({ item: null })
  }
  return rows
})

watch(
  () => form.value.category,
  (category) => {
    if (category !== '拼豆') {
      form.value.spec = ''
      form.value.refillItems = []
    }
    form.value.brand = ''
  },
)

watch(
  () => form.value.spec,
  (spec) => {
    if (spec !== '补充装') {
      form.value.refillItems = []
    } else {
      activeSeries.value = 'A'
    }
  },
)

watch(filteredExpenses, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

watch(linkedExpenses, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const resetForm = () => {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  form.value = {
    date: `${today.getFullYear()}-${month}-${day}`,
    category: '拼豆',
    spec: '',
    brand: '',
    channel: '',
    amount: null,
    note: '',
    refillItems: [],
  }
  activeSeries.value = 'A'
}

const closeForm = () => {
  if (saving.value) return
  formVisible.value = false
}

const openCreate = () => {
  dialogMode.value = 'create'
  editingRow.value = null
  resetForm()
  formVisible.value = true
}

const openEdit = (item) => {
  dialogMode.value = 'edit'
  editingRow.value = item
  const data = getExpenseFormData(item)
  form.value = {
    date: data.date,
    category: data.category || '拼豆',
    spec: data.spec || '',
    brand: data.brand || '',
    channel: data.channel || '',
    amount: data.amount === '' || data.amount == null ? null : Number(data.amount),
    note: data.note || '',
    refillItems: Array.isArray(data.refillItems)
      ? data.refillItems.map((item) => ({
          code: item.code,
          weight: item.weight || '',
        }))
      : [],
  }
  activeSeries.value = 'A'
  formVisible.value = true
  if (form.value.spec === '补充装' && form.value.refillItems.length) {
    // 打开编辑时若表格有色号，用色号+重量回填备注（已有手动备注则保留）
    if (!String(form.value.note || '').trim()) {
      syncNoteFromRefill()
    }
  }
}

const openView = (item) => {
  viewTarget.value = item
  viewVisible.value = true
}

const closeView = () => {
  viewVisible.value = false
  viewTarget.value = null
}

const goToSource = () => {
  const target = viewSourceRoute.value
  if (!target) return
  closeView()
  router.push(target)
}

const openDelete = (item) => {
  deleteTarget.value = item
  deleteVisible.value = true
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (showRefillPicker.value) {
      // 优先按备注识别色号；备注为空时再按色卡表格生成备注
      syncRefillFromNote()
      if (!String(form.value.note || '').trim() && form.value.refillItems.length) {
        syncNoteFromRefill()
      }
    }
    if (dialogMode.value === 'edit' && editingRow.value) {
      await updateExpense(editingRow.value, form.value)
      showSuccess('已保存')
    } else {
      addManualExpense(form.value)
      showSuccess('已记一笔')
    }
    formVisible.value = false
  } catch (error) {
    showError(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await removeExpense(deleteTarget.value)
    deleteVisible.value = false
    showSuccess('已删除')
  } catch (error) {
    showError(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadPatterns()
})

const goToReview = () => {
  router.push({ name: 'cost-review' })
}

const goToStatistics = () => {
  router.push({
    name: 'statistics',
    query: { tab: 'cost' },
  })
}
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

.btn-secondary {
  height: 36px;
  padding: 0 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary {
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-accent-deep);
}

.summary-row {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
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
  width: 100%;
  max-width: 100%;
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-item label {
  flex-shrink: 0;
  min-width: 64px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
  text-align: right;
}

.search-item select {
  width: 140px;
  min-width: 0;
  height: 32px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-color: var(--color-pale);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236e5660' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search-item select:focus {
  border-color: var(--color-accent);
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a83858' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
}

.search-item-date {
  align-items: center;
}

.search-date-range {
  width: 260px;
}

.search-date-range :deep(.el-input__wrapper) {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
  background: var(--color-pale);
}

.search-date-range :deep(.el-input__wrapper:hover),
.search-date-range :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
  background: #fff;
}

.search-date-range :deep(.el-range-input) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.search-date-range :deep(.el-range-separator) {
  color: var(--color-text-regular);
  font-size: 13px;
}

.btn-search-reset {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
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
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.data-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

thead th {
  z-index: 1;
  padding: 0 6px;
  color: var(--color-text-secondary);
  font-weight: 500;
  background: var(--color-pale);
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

th,
td {
  padding: 0 6px;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

th {
  color: var(--color-text-secondary);
  font-weight: 500;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: #fff9fb;
}

.col-index {
  width: 6%;
}

.col-date {
  width: 11%;
}

.col-category {
  width: 10%;
}

.col-spec {
  width: 9%;
}

.col-brand {
  width: 9%;
}

.col-channel {
  width: 10%;
}

.col-amount {
  width: 10%;
  color: var(--color-accent);
  font-weight: 600;
}

.col-note {
  width: 24%;
  text-align: left;
}

.col-action {
  width: 14%;
}

.empty-cell {
  padding: 32px 12px !important;
  color: var(--color-text-secondary);
}

.action-links {
  display: inline-flex;
  gap: 10px;
}

.link {
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.link-danger {
  color: #d64545;
}

.confirm-text {
  margin: 0;
  color: var(--color-text-primary);
}

.confirm-tip {
  margin: 10px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.view-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(61, 42, 50, 0.45);
  backdrop-filter: blur(2px);
}

.view-dialog-box {
  width: 480px;
  max-width: 92vw;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(168, 56, 88, 0.18);
  overflow: hidden;
}

.view-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, #fff 0%, var(--color-pale) 100%);
}

.view-header-text h4 {
  margin: 8px 0 4px;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.view-header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.view-dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-dialog-close:hover {
  background: #fff;
  color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(168, 56, 88, 0.12);
}

.view-category-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.tag-board {
  background: #e8f8f4;
  color: #0d9488;
}

.tag-pen {
  background: #fff0f3;
  color: #a83858;
}

.tag-scoop {
  background: #fff7ed;
  color: #ea580c;
}

.tag-other {
  background: #f0fdf4;
  color: #16a34a;
}

.tag-pattern {
  background: #eff6ff;
  color: #2563eb;
}

.tag-member {
  background: #f3ebff;
  color: #9333ea;
}

.tag-bead {
  background: #fef3c7;
  color: #d97706;
}

.tag-tool-member {
  background: #fff0f4;
  color: var(--color-accent);
}

.tag-default {
  background: var(--color-pale);
  color: var(--color-text-secondary);
}

.view-dialog-body {
  padding: 18px 20px;
}

.view-amount-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-pale) 0%, #fff 100%);
}

.view-amount-label {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.view-amount-value {
  color: var(--color-accent);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.view-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.view-info-item {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.view-info-label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.view-info-value {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 500;
  word-break: break-word;
}

.view-note-block {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

.view-note-text {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.view-source-tip {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff9fb;
  border: 1px solid #f5d6df;
}

.view-tip-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
}

.view-source-tip p {
  margin: 0;
  color: var(--color-text-regular);
  font-size: 13px;
  line-height: 1.6;
}

.view-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--color-border);
  background: #fff;
}

.btn-view-close,
.btn-view-source {
  min-width: 96px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view-close {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-view-close:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-view-source {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-view-source:hover {
  filter: brightness(1.05);
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

.field-full {
  width: 100%;
}

.form-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(61, 42, 50, 0.45);
  backdrop-filter: blur(2px);
}

.form-dialog-box {
  width: 480px;
  max-width: 92vw;
  max-height: min(90vh, 900px);
  margin: auto;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(168, 56, 88, 0.18);
  overflow: hidden;
}

.form-dialog-box--wide {
  width: min(980px, 96vw);
  max-height: calc(100vh - 32px);
  overflow: hidden;
}

.form-dialog-box--wide .form-dialog-header {
  padding: 14px 20px 12px;
}

.form-dialog-box--wide .form-dialog-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 12px 20px 14px;
}

.form-dialog-box--wide .form-grid {
  flex-shrink: 0;
  gap: 10px 16px;
}

.form-dialog-box--wide .refill-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.form-dialog-box--wide .refill-head,
.form-dialog-box--wide .series-tabs,
.form-dialog-box--wide .series-name,
.form-dialog-box--wide .refill-color-grid {
  flex-shrink: 0;
}

.form-dialog-box--wide .refill-table-wrap {
  flex: 1 1 auto;
  max-height: 200px;
  min-height: 88px;
  overflow-x: hidden;
  overflow-y: auto;
}

.form-dialog-box--wide .form-dialog-footer {
  flex-shrink: 0;
  margin-top: 12px;
  padding-top: 12px;
}

.form-dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, #fff 0%, var(--color-pale) 100%);
}

.form-header-text h4 {
  margin: 8px 0 4px;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.form-header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.form-dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-dialog-close:hover:not(:disabled) {
  background: #fff;
  color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(168, 56, 88, 0.12);
}

.form-dialog-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-dialog-body {
  flex: 1;
  min-height: 0;
  padding: 18px 20px 20px;
  overflow: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}

.form-span-2 {
  grid-column: span 2;
}

.refill-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0e4ea;
}

.refill-head h5 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 650;
}

.refill-head p {
  margin: 4px 0 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.series-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.series-tab {
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #f0e4ea;
  border-radius: 8px;
  background: #fff;
  color: #6e5660;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.series-tab.active {
  border-color: var(--color-accent);
  background: #fff5f8;
  color: var(--color-accent);
}

.series-name {
  margin: 0 0 10px;
  color: #9a8790;
  font-size: 12px;
}

.refill-color-grid {
  display: grid;
  grid-template-columns: repeat(13, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 12px;
  padding: 2px;
}

.color-tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}

.color-tile.selected {
  box-shadow:
    0 0 0 1px #fff,
    0 0 0 2px var(--color-accent);
  z-index: 1;
}

.color-tile .code {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.color-tile .check {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 9px;
  font-weight: 800;
}

.refill-table-wrap {
  overflow: auto;
  border: 1px solid #f0e4ea;
  border-radius: 10px;
}

.refill-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.refill-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.refill-table th,
.refill-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f5eef2;
  text-align: center;
  font-size: 13px;
}

.refill-table th {
  background: #fff7fa;
  color: #52404a;
  font-weight: 650;
}

.refill-code {
  font-weight: 700;
  color: #3d2f36;
}

.refill-swatch {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  vertical-align: middle;
}

.refill-weight-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.refill-weight-input {
  width: 88px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #efe4e9;
  border-radius: 8px;
  color: #3d2f36;
  font-size: 13px;
  outline: none;
}

.refill-weight-input:focus {
  border-color: var(--color-accent);
}

.refill-weight-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  min-width: 0;
}

.refill-weight-chip {
  padding: 0;
  border: none;
  background: transparent;
  color: #c45c78;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
}

.refill-weight-chip:hover {
  color: var(--color-accent);
  text-decoration: underline;
}

.refill-remove {
  border: none;
  background: transparent;
  color: #c45c78;
  font-size: 12px;
  cursor: pointer;
}

.refill-empty {
  color: #b8a8b0;
  padding: 16px 10px !important;
}

.view-refill-block {
  margin-top: 14px;
}

.view-refill-block .view-info-label {
  display: block;
  margin-bottom: 8px;
}

.view-refill-table {
  border: 1px solid #f0e4ea;
  border-radius: 10px;
  overflow: hidden;
}

@media (max-width: 720px) {
  .refill-color-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

.form-item label {
  display: block;
  margin-bottom: 7px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.label-required::before {
  content: '*';
  margin-right: 4px;
  color: #e85d6a;
}

.form-fixed-value {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-pale);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
}

.form-select {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-color: var(--color-pale);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236e5660' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
}

.form-select:focus {
  border-color: var(--color-accent);
  background-color: #fff;
}

.form-item :deep(.el-input__wrapper),
.form-item :deep(.el-input-number),
.form-item :deep(.el-date-editor) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.form-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.btn-form-cancel,
.btn-form-primary {
  min-width: 88px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-form-cancel {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-form-cancel:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-form-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-form-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-form-cancel:disabled,
.btn-form-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.dialog-field-popper {
  z-index: 2100 !important;
}
</style>
