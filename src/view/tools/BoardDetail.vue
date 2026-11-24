<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="btn-back" @click="goBack">← 返回</button>
        <h3>拼豆板</h3>
        <span class="header-badge">共 {{ activeCount }} 件在用</span>
        <span class="header-badge header-badge-amount">共计金额 {{ formatToolTotalAmount(totalAmount) }}</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="openBatchImage">批量上传图片</button>
        <button type="button" class="btn-secondary" @click="openImport">Excel 导入</button>
        <el-button type="primary" @click="openCreate">新增豆板</el-button>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>豆板名称</label>
          <el-input v-model="searchForm.name" class="search-name-input" placeholder="请输入豆板名称" clearable />
        </div>
        <div v-if="isAll" class="search-item">
          <label>规格</label>
          <select v-model="searchForm.size">
            <option value="">全部规格</option>
            <option v-for="size in BOARD_SIZES" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
        <div class="search-item">
          <label>底板</label>
          <select v-model="searchForm.basePlate">
            <option value="">全部底板</option>
            <option v-for="plate in basePlateOptions" :key="plate" :value="plate">
              {{ plate }}
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
        <div class="search-item">
          <label>瑕疵状态</label>
          <select v-model="searchForm.defectStatus">
            <option value="">全部</option>
            <option v-for="opt in BOARD_DEFECT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">重置</button>
      </div>
    </div>

    <div class="table-toolbar">
      <span v-if="selectedKeys.length" class="selected-count">已选 {{ selectedKeys.length }} 项</span>
      <button type="button" class="btn-batch-status" :disabled="!selectedKeys.length" @click="openBatchStatusDialog">
        批量修改状态
      </button>
      <button type="button" class="btn-batch-delete" :disabled="!selectedKeys.length" @click="openBatchDeleteConfirm">
        批量删除
      </button>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th class="col-check">
              <input type="checkbox" class="row-checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
            </th>
            <th class="col-index">序号</th>
            <th class="col-name">豆板名称</th>
            <th class="col-thumb">豆板图片</th>
            <th class="col-size">规格</th>
            <th class="col-base">底板</th>
            <th class="col-text">品牌</th>
            <th class="col-text">购买渠道</th>
            <th class="col-date">购买日期</th>
            <th class="col-num">价格</th>
            <th class="col-stock">数量</th>
            <th class="col-status">状态</th>
            <th class="col-defect">瑕疵状态</th>
            <th class="col-note">备注</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pagedList" :key="getBoardRowKey(item)" :class="{ 'row-selected': isSelected(item) }">
            <td class="col-check">
              <input type="checkbox" class="row-checkbox" :checked="isSelected(item)" @change="toggleSelect(item)" />
            </td>
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td class="col-thumb">
              <span class="board-thumb-wrap">
                <img v-if="item.image" class="board-thumb" :src="item.image" :alt="item.name" width="40"
                  height="40" @click="openPreview(item)" />
                <span v-else class="board-thumb-placeholder">无图</span>
              </span>
            </td>
            <td>{{ item.size || displaySize }}</td>
            <td>{{ item.basePlate || '—' }}</td>
            <td>{{ item.brand || '—' }}</td>
            <td>{{ item.channel || '—' }}</td>
            <td>{{ item.purchaseDate || '—' }}</td>
            <td>{{ formatPrice(item.price) }}</td>
            <td>× {{ item.stock ?? 1 }}</td>
            <td>
              <span :class="['tag', statusTagClass(item.status)]">{{ item.status || '在用' }}</span>
            </td>
            <td>
              <span :class="['tag', defectTagClass(item.defectStatus)]">{{ item.defectStatus || '无暇' }}</span>
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
            <td colspan="15" class="empty-cell">暂无数据</td>
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

    <BoardFormDialog v-model:visible="formVisible" :mode="dialogMode" :default-size-slug="isAll ? '' : slug"
      :edit-record="editRecord" :saving="saving" @submit="handleSubmit" />

    <BoardDeleteDialog v-model:visible="deleteConfirmVisible" :mode="deleteMode" :target-name="deleteTarget?.name"
      :count="deleteCount" :loading="deleting" @confirm="confirmDelete" />

    <BoardBatchStatusDialog
      v-model:visible="batchStatusVisible"
      :count="selectedKeys.length"
      :loading="batchStatusSaving"
      @confirm="confirmBatchStatus"
    />

    <PatternPreviewDialog v-model:visible="previewVisible" :name="preview?.name" :image="preview?.image" />

    <ToolBatchImportDialog
      v-model:visible="importVisible"
      tool-type="board"
      :default-board-slug="slug"
      :importing="importing"
      @import="handleImport"
    />

    <BoardBatchImageDialog
      v-model:visible="batchImageVisible"
      :boards="batchImageBoards"
      :uploading="batchImageUploading"
      @confirm="handleBatchImage"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadImage } from '@/api/upload'
import { useMessage } from '@/composables/useMessage'
import PatternPreviewDialog from '@/view/pattern/components/PatternPreviewDialog.vue'
import {
  addBoardItem,
  BOARD_ALL_SLUG,
  BOARD_DEFECT_OPTIONS,
  BOARD_SIZES,
  BOARD_STATUS_OPTIONS,
  deleteBoardItem,
  deleteBoardItems,
  updateBoardItemsStatus,
  getBoardActiveCount,
  getBoardDisplayName,
  getBoardList,
  getBoardRowKey,
  formatToolTotalAmount,
  sumItemPrices,
  updateBoardItem,
} from './constants'
import BoardBatchStatusDialog from './components/BoardBatchStatusDialog.vue'
import BoardBatchImageDialog from './components/BoardBatchImageDialog.vue'
import BoardDeleteDialog from './components/BoardDeleteDialog.vue'
import BoardFormDialog from './components/BoardFormDialog.vue'
import ToolBatchImportDialog from './components/ToolBatchImportDialog.vue'
import { useListTablePagination } from '@/composables/useListTablePagination'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useMessage()

const formVisible = ref(false)
const dialogMode = ref('create')
const editRecord = ref(null)
const saving = ref(false)
const importing = ref(false)
const importVisible = ref(false)
const batchImageVisible = ref(false)
const batchImageUploading = ref(false)
const deleting = ref(false)
const batchStatusVisible = ref(false)
const batchStatusSaving = ref(false)
const deleteConfirmVisible = ref(false)
const deleteMode = ref('single')
const deleteTarget = ref(null)
const deleteCount = ref(0)
const selectedKeys = ref([])
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const searchForm = ref({
  name: '',
  size: '',
  basePlate: '',
  brand: '',
  status: '',
  defectStatus: '',
})

const preview = ref(null)
const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (val) => {
    if (!val) preview.value = null
  },
})

const slug = computed(() => String(route.params.size || ''))
const isAll = computed(() => slug.value === BOARD_ALL_SLUG)
const displaySize = computed(() => getBoardDisplayName(slug.value))
const sourceList = computed(() => getBoardList(slug.value))
const batchImageBoards = computed(() => sourceList.value)
const activeCount = computed(() => getBoardActiveCount(slug.value))

const basePlateOptions = computed(() => {
  const set = new Set()
  sourceList.value.forEach((item) => {
    const plate = (item.basePlate || '').trim()
    if (plate) set.add(plate)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const brandOptions = computed(() => {
  const set = new Set()
  sourceList.value.forEach((item) => {
    const brand = (item.brand || '').trim()
    if (brand) set.add(brand)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const resolveItemSize = (item) => item.size || displaySize.value

const filteredList = computed(() => {
  const { name, size, basePlate, brand, status, defectStatus } = searchForm.value
  const nameKey = name.trim()

  return sourceList.value.filter((item) => {
    if (nameKey && !item.name.includes(nameKey)) return false
    if (size && resolveItemSize(item) !== size) return false
    if (basePlate && (item.basePlate || '').trim() !== basePlate) return false
    if (brand && (item.brand || '').trim() !== brand) return false
    if (status && (item.status || '在用') !== status) return false
    if (defectStatus && (item.defectStatus || '无暇') !== defectStatus) return false
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
    name: '',
    size: '',
    basePlate: '',
    brand: '',
    status: '',
    defectStatus: '',
  }
  currentPage.value = 1
}

const clearSelection = () => {
  selectedKeys.value = []
}

watch(searchForm, () => {
  currentPage.value = 1
}, { deep: true })

watch(slug, () => {
  currentPage.value = 1
  clearSelection()
})

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
  if (status === '在途') return 'tag-transit'
  if (status === '已售') return 'tag-sold'
  if (status === '送人') return 'tag-gift'
  if (status === '损耗') return 'tag-loss'
  return 'tag-using'
}

const defectTagClass = (defect) => {
  if (defect === '-') return 'tag-dash'
  if (defect === '微瑕') return 'tag-minor'
  if (defect === '重瑕') return 'tag-major'
  return 'tag-perfect'
}

const isSelected = (item) => selectedKeys.value.includes(getBoardRowKey(item))

const toggleSelect = (item) => {
  const key = getBoardRowKey(item)
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
  const pageKeys = pagedList.value.map((item) => getBoardRowKey(item))
  if (isAllSelected.value) {
    selectedKeys.value = selectedKeys.value.filter((key) => !pageKeys.includes(key))
  } else {
    selectedKeys.value = [...new Set([...selectedKeys.value, ...pageKeys])]
  }
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
      size: payload.size,
      channel: payload.channel,
      brand: payload.brand,
      price: payload.price,
      purchaseDate: payload.purchaseDate,
      basePlate: payload.basePlate,
      note: payload.note,
      status: payload.status,
      defectStatus: payload.defectStatus,
      stock: payload.stock,
      image: imageUrl,
    }

    if (payload.mode === 'edit') {
      updateBoardItem(payload.sizeSlug, payload.id, data, payload.originalSizeSlug)
      showSuccess('编辑成功')
    } else {
      addBoardItem(payload.sizeSlug, data)
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

const openBatchImage = () => {
  batchImageVisible.value = true
}

const runWithConcurrency = async (items, fn, limit = 3) => {
  const results = new Array(items.length)
  let index = 0

  const worker = async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await fn(items[current], current)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

const handleBatchImage = async ({ matches }) => {
  batchImageUploading.value = true
  let success = 0
  let failed = 0

  try {
    await runWithConcurrency(matches, async (row) => {
      try {
        const imageUrl = await uploadImage(row.file)
        const item = row.item
        updateBoardItem(item.sizeSlug, item.id, { ...item, image: imageUrl })
        success += 1
      } catch (error) {
        failed += 1
        console.error(error)
      }
    })

    batchImageVisible.value = false
    if (failed === 0) {
      showSuccess(`已成功为 ${success} 件豆板更新图片`)
    } else if (success > 0) {
      showError(`成功 ${success} 张，失败 ${failed} 张`)
    } else {
      showError('批量上传失败，请确认后端服务正常')
    }
  } catch (error) {
    console.error(error)
    showError(error.message || '批量上传失败')
  } finally {
    batchImageUploading.value = false
  }
}

const handleImport = async ({ items }) => {
  importing.value = true
  try {
    items.forEach(({ sizeSlug, data }) => {
      addBoardItem(sizeSlug, data)
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

const openBatchStatusDialog = () => {
  batchStatusVisible.value = true
}

const confirmBatchStatus = async (status) => {
  batchStatusSaving.value = true
  try {
    const entries = sourceList.value
      .filter((item) => selectedKeys.value.includes(getBoardRowKey(item)))
      .map((item) => ({ slug: item.sizeSlug, id: item.id }))
    const count = updateBoardItemsStatus(entries, status)
    clearSelection()
    batchStatusVisible.value = false
    showSuccess(`已修改 ${count} 条状态为「${status}」`)
  } finally {
    batchStatusSaving.value = false
  }
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    if (deleteMode.value === 'single' && deleteTarget.value) {
      deleteBoardItem(deleteTarget.value.sizeSlug, deleteTarget.value.id)
      showSuccess('删除成功')
    } else if (deleteMode.value === 'batch') {
      const entries = sourceList.value
        .filter((item) => selectedKeys.value.includes(getBoardRowKey(item)))
        .map((item) => ({ slug: item.sizeSlug, id: item.id }))
      deleteBoardItems(entries)
      clearSelection()
      showSuccess(`已删除 ${entries.length} 条`)
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

.search-name-input {
  width: 130px;
}

.search-name-input :deep(.el-input__wrapper) {
  height: 32px;
  padding: 0 8px 0 12px;
  border-radius: 6px;
  background: var(--color-pale);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.search-name-input :deep(.el-input__wrapper:hover),
.search-name-input :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.search-name-input :deep(.el-input__inner) {
  color: var(--color-text-primary);
  font-size: 13px;
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

.btn-batch-status {
  padding: 6px 14px;
  border: 1px solid #f0c4d0;
  border-radius: 6px;
  background: #fff9fb;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-batch-status:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: #fff0f4;
}

.btn-batch-status:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.board-thumb {
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
  width: 7%;
}

.col-name {
  width: 10%;
}

.col-size {
  width: 7%;
}

.col-base {
  width: 8%;
}

.col-text {
  width: 7%;
}

.col-date {
  width: 9%;
}

.col-num {
  width: 6%;
}

.col-stock {
  width: 5%;
}

.col-status {
  width: 6%;
}

.col-defect {
  width: 8%;
}

.col-note {
  width: 12%;
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

.tag-transit {
  background: #eff6ff;
  color: #2563eb;
}

.tag-sold {
  background: #f3f4f6;
  color: #6b7280;
}

.tag-gift {
  background: #f3ebff;
  color: #9333ea;
}

.tag-loss {
  background: #fff7ed;
  color: #c2410c;
}

.tag-perfect {
  background: #e8f8f4;
  color: #0d9488;
}

.tag-dash {
  background: #f3f4f6;
  color: #9ca3af;
}

.tag-minor {
  background: #fff7ed;
  color: #ea580c;
}

.tag-major {
  background: #fff0f2;
  color: #e85d6a;
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
