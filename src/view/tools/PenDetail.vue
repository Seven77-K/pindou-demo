<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="btn-back" @click="goBack">← 返回</button>
        <h3>拼豆笔</h3>
        <span class="header-badge">共 {{ activeCount }} 条在用</span>
        <span class="header-badge header-badge-amount">共计金额 {{ formatToolTotalAmount(totalAmount) }}</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="openImport">Excel 导入</button>
        <el-button type="primary" @click="openCreate">新增豆笔</el-button>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>材质</label>
          <select v-model="searchForm.material">
            <option value="">全部材质</option>
            <option v-for="opt in materialOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>样式</label>
          <select v-model="searchForm.style">
            <option value="">全部样式</option>
            <option v-for="opt in styleOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>规格</label>
          <select v-model="searchForm.spec">
            <option value="">全部规格</option>
            <option v-for="opt in specOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>品牌</label>
          <select v-model="searchForm.brand">
            <option value="">全部品牌</option>
            <option v-for="opt in brandOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>状态</label>
          <select v-model="searchForm.status">
            <option value="">全部状态</option>
            <option v-for="opt in BOARD_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">重置</button>
      </div>
    </div>

    <div class="table-toolbar">
      <span v-if="selectedKeys.length" class="selected-count">已选 {{ selectedKeys.length }} 项</span>
      <button
        type="button"
        class="btn-batch-delete"
        :disabled="!selectedKeys.length"
        @click="openBatchDeleteConfirm"
      >
        批量删除
      </button>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th class="col-check">
              <input
                type="checkbox"
                class="row-checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th class="col-index">序号</th>
            <th class="col-name">豆笔名称</th>
            <th class="col-thumb">豆笔图片</th>
            <th class="col-material">材质</th>
            <th class="col-style">样式</th>
            <th class="col-spec">规格</th>
            <th class="col-text">品牌</th>
            <th class="col-text">购买渠道</th>
            <th class="col-date">购买日期</th>
            <th class="col-num">价格</th>
            <th class="col-status">状态</th>
            <th class="col-note">备注</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in pagedList"
            :key="getPenRowKey(item)"
            :class="{ 'row-selected': isSelected(item) }"
          >
            <td class="col-check">
              <input
                type="checkbox"
                class="row-checkbox"
                :checked="isSelected(item)"
                @change="toggleSelect(item)"
              />
            </td>
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td class="col-thumb">
              <span class="pen-thumb-wrap">
                <img
                  v-if="item.image"
                  class="pen-thumb"
                  :src="item.image"
                  :alt="item.name"
                  width="40"
                  height="40"
                  @click="openPreview(item)"
                />
                <span v-else class="pen-thumb-placeholder">无图</span>
              </span>
            </td>
            <td>{{ item.material || '—' }}</td>
            <td>{{ item.style || '—' }}</td>
            <td>{{ item.spec || '—' }}</td>
            <td>{{ item.brand || '—' }}</td>
            <td>{{ item.channel || '—' }}</td>
            <td>{{ item.purchaseDate || '—' }}</td>
            <td>{{ formatPrice(item.price) }}</td>
            <td>
              <span :class="['tag', statusTagClass(item.status)]">{{ item.status || '在用' }}</span>
            </td>
            <td class="col-note">{{ item.note || '—' }}</td>
            <td>
              <span class="action-links">
                <a class="link" @click="openEdit(item)">编辑</a>
                <a class="link link-danger" @click="openDeleteConfirm(item)">删除</a>
              </span>
            </td>
          </tr>
          <tr v-if="!pagedList.length">
            <td colspan="14" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ filteredTotal }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">
        首页
      </button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">
        上一页
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">
        下一页
      </button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">
        尾页
      </button>
    </div>

    <PenFormDialog
      v-model:visible="formVisible"
      :mode="dialogMode"
      :edit-record="editRecord"
      :saving="saving"
      @submit="handleSubmit"
    />

    <BoardDeleteDialog
      v-model:visible="deleteConfirmVisible"
      :mode="deleteMode"
      :target-name="deleteTarget?.name"
      :count="deleteCount"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <PatternPreviewDialog
      v-model:visible="previewVisible"
      :name="preview?.name"
      :image="preview?.image"
    />

    <ToolBatchImportDialog
      v-model:visible="importVisible"
      tool-type="pen"
      :importing="importing"
      @import="handleImport"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { uploadImage } from '@/api/upload'
import { useMessage } from '@/composables/useMessage'
import PatternPreviewDialog from '@/view/pattern/components/PatternPreviewDialog.vue'
import {
  addToolItem,
  BOARD_STATUS_OPTIONS,
  deleteToolItem,
  deleteToolItems,
  formatToolTotalAmount,
  getPenActiveCount,
  getPenList,
  getPenRowKey,
  PEN_MATERIAL_OPTIONS,
  PEN_STYLE_OPTIONS,
  sumItemPrices,
  toolInventory,
  updateToolItem,
} from './constants'
import BoardDeleteDialog from './components/BoardDeleteDialog.vue'
import PenFormDialog from './components/PenFormDialog.vue'
import ToolBatchImportDialog from './components/ToolBatchImportDialog.vue'
import { useListTablePagination } from '@/composables/useListTablePagination'

const router = useRouter()
const { showSuccess, showError } = useMessage()

const formVisible = ref(false)
const dialogMode = ref('create')
const editRecord = ref(null)
const saving = ref(false)
const importing = ref(false)
const importVisible = ref(false)
const deleting = ref(false)
const deleteConfirmVisible = ref(false)
const deleteMode = ref('single')
const deleteTarget = ref(null)
const deleteCount = ref(0)
const selectedKeys = ref([])
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const searchForm = ref({
  material: '',
  style: '',
  spec: '',
  brand: '',
  status: '',
})

const preview = ref(null)
const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (val) => {
    if (!val) preview.value = null
  },
})

const sourceList = computed(() => {
  void toolInventory
  return getPenList()
})
const activeCount = computed(() => getPenActiveCount())

const buildFieldOptions = (field, presetOptions = []) => {
  const set = new Set(presetOptions.map((opt) => opt.value))
  sourceList.value.forEach((item) => {
    const value = (item[field] || '').trim()
    if (value) set.add(value)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const materialOptions = computed(() => buildFieldOptions('material', PEN_MATERIAL_OPTIONS))
const styleOptions = computed(() => buildFieldOptions('style', PEN_STYLE_OPTIONS))
const specOptions = computed(() => buildFieldOptions('spec'))
const brandOptions = computed(() => buildFieldOptions('brand'))

const filteredList = computed(() => {
  const { material, style, spec, brand, status } = searchForm.value

  return sourceList.value.filter((item) => {
    if (material && (item.material || '').trim() !== material) return false
    if (style && (item.style || '').trim() !== style) return false
    if (spec && (item.spec || '').trim() !== spec) return false
    if (brand && (item.brand || '').trim() !== brand) return false
    if (status && (item.status || '在用') !== status) return false
    return true
  })
})

const sortedFilteredList = computed(() =>
  [...filteredList.value].sort((a, b) => {
    const dateA = (a.purchaseDate || '').trim()
    const dateB = (b.purchaseDate || '').trim()
    if (!dateA && !dateB) return a.name.localeCompare(b.name, 'zh-CN')
    if (!dateA) return 1
    if (!dateB) return -1
    const cmp = dateB.localeCompare(dateA)
    return cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'zh-CN')
  }),
)

const filteredTotal = computed(() => sortedFilteredList.value.length)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedFilteredList.value.slice(start, start + pageSize.value)
})

const totalAmount = computed(() => sumItemPrices(filteredList.value))

const resetSearch = () => {
  searchForm.value = {
    material: '',
    style: '',
    spec: '',
    brand: '',
    status: '',
  }
  currentPage.value = 1
}

watch(searchForm, () => {
  currentPage.value = 1
}, { deep: true })

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages
  }
})

const formatPrice = (price) => {
  if (price === '' || price == null) return '—'
  const num = Number(price)
  if (Number.isNaN(num)) return '—'
  return num % 1 === 0 ? `¥${num}` : `¥${num.toFixed(2)}`
}

const statusTagClass = (status) => {
  if (status === '已售') return 'tag-sold'
  if (status === '送人') return 'tag-gift'
  return 'tag-using'
}

const isSelected = (item) => selectedKeys.value.includes(getPenRowKey(item))

const toggleSelect = (item) => {
  const key = getPenRowKey(item)
  if (isSelected(item)) {
    selectedKeys.value = selectedKeys.value.filter((k) => k !== key)
  } else {
    selectedKeys.value = [...selectedKeys.value, key]
  }
}

const isAllSelected = computed(() => {
  const rows = pagedList.value
  return rows.length > 0 && rows.every((item) => isSelected(item))
})

const toggleSelectAll = () => {
  const pageKeys = pagedList.value.map((item) => getPenRowKey(item))
  if (isAllSelected.value) {
    selectedKeys.value = selectedKeys.value.filter((key) => !pageKeys.includes(key))
  } else {
    selectedKeys.value = [...new Set([...selectedKeys.value, ...pageKeys])]
  }
}

const clearSelection = () => {
  selectedKeys.value = []
}

const resolveImageUrl = async ({ imageFile, imageCleared, existingImage }) => {
  if (imageFile) {
    return uploadImage(imageFile)
  }
  if (imageCleared) {
    return ''
  }
  return existingImage || ''
}

const handleSubmit = async (payload) => {
  saving.value = true
  try {
    const imageUrl = await resolveImageUrl(payload)
    const data = {
      name: payload.name,
      material: payload.material,
      style: payload.style,
      spec: payload.spec,
      brand: payload.brand,
      channel: payload.channel,
      price: payload.price,
      purchaseDate: payload.purchaseDate,
      note: payload.note,
      status: payload.status,
      image: imageUrl,
    }

    if (payload.mode === 'edit') {
      updateToolItem('pen', payload.id, data)
      showSuccess('编辑成功')
    } else {
      addToolItem('pen', data)
      showSuccess('新增成功')
    }

    formVisible.value = false
  } catch (error) {
    console.error(error)
    showError(error.message || '保存失败，请先运行 npm run backend 启动本地后端')
  } finally {
    saving.value = false
  }
}

const openCreate = () => {
  dialogMode.value = 'create'
  editRecord.value = null
  formVisible.value = true
}

const openImport = () => {
  importVisible.value = true
}

const handleImport = async ({ items }) => {
  importing.value = true
  try {
    items.forEach((item) => {
      addToolItem('pen', item)
    })
    showSuccess(`已成功导入 ${items.length} 条`)
    importVisible.value = false
  } catch (error) {
    showError(error?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

const openEdit = (item) => {
  dialogMode.value = 'edit'
  editRecord.value = { ...item }
  formVisible.value = true
}

const openDeleteConfirm = (item) => {
  deleteMode.value = 'single'
  deleteTarget.value = item
  deleteCount.value = 1
  deleteConfirmVisible.value = true
}

const openBatchDeleteConfirm = () => {
  deleteMode.value = 'batch'
  deleteTarget.value = null
  deleteCount.value = selectedKeys.value.length
  deleteConfirmVisible.value = true
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    if (deleteMode.value === 'single' && deleteTarget.value) {
      deleteToolItem('pen', deleteTarget.value.id)
      showSuccess('删除成功')
    } else if (deleteMode.value === 'batch') {
      const ids = sourceList.value
        .filter((item) => selectedKeys.value.includes(getPenRowKey(item)))
        .map((item) => item.id)
      deleteToolItems('pen', ids)
      clearSelection()
      showSuccess(`已删除 ${ids.length} 条`)
    }
    deleteConfirmVisible.value = false
  } finally {
    deleting.value = false
  }
}

const openPreview = (item) => {
  if (!item.image) return
  preview.value = {
    name: item.name,
    image: item.image,
  }
}

const goBack = () => {
  router.push({ name: 'tools' })
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
  margin-bottom: 12px;
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
}

.btn-back {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
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

.header-badge-amount {
  background: #fff5f7;
  color: var(--color-accent);
}

.search-bar {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  margin-bottom: 12px;
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
  width: 120px;
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

.table-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.selected-count {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.btn-batch-delete {
  padding: 6px 14px;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  background: #fff5f6;
  color: #e85d6a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-delete:hover:not(:disabled) {
  border-color: #e85d6a;
  background: #ffeef0;
}

.btn-batch-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.pen-thumb {
  cursor: zoom-in;
}

tbody tr.row-selected {
  background: #fff9fb;
}

.col-check {
  width: 4%;
}

.col-index {
  width: 5%;
}

.col-thumb {
  width: 8%;
}

.col-name {
  width: 9%;
}

.col-material,
.col-style {
  width: 7%;
}

.col-spec {
  width: 7%;
}

.col-text {
  width: 9%;
}

.col-date {
  width: 10%;
}

.col-num {
  width: 8%;
}

.col-status {
  width: 8%;
}

.col-note {
  width: 14%;
  white-space: normal;
}

.col-action {
  width: 10%;
}

.row-checkbox {
  width: 15px;
  height: 15px;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.tag-using {
  background: #e8f8f4;
  color: #0d9488;
}

.tag-sold {
  background: #f3f4f6;
  color: #6b7280;
}

.tag-gift {
  background: #f3ebff;
  color: #9333ea;
}

.action-links {
  display: inline-flex;
  gap: 10px;
  justify-content: center;
}

.link {
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.link:hover {
  opacity: 0.85;
}

.link-danger {
  color: #e85d6a;
}

.empty-cell {
  padding: 32px 12px;
  color: var(--color-text-secondary);
  text-align: center;
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
  font-size: 13px;
}

.page-info {
  color: var(--color-text-regular);
  font-size: 13px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
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
