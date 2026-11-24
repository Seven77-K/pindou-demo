<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="btn-back" @click="goBack">← 返回</button>
        <h3>其他</h3>
        <span class="header-badge">共 {{ stockTotal }} 件在用</span>
        <span class="header-badge header-badge-amount">共计金额 {{ formatToolTotalAmount(totalAmount) }}</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="openImport">Excel 导入</button>
        <el-button type="primary" @click="openCreate">新增工具</el-button>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-fields">
        <div class="search-item">
          <label>类别</label>
          <select v-model="searchForm.category">
            <option value="">全部类别</option>
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
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
          <label>购买渠道</label>
          <select v-model="searchForm.channel">
            <option value="">全部渠道</option>
            <option v-for="opt in channelOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
        <button type="button" class="btn-search-reset" @click="resetSearch">重置</button>
      </div>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th class="col-index">序号</th>
            <th class="col-name">工具名称</th>
            <th class="col-category">类别</th>
            <th class="col-spec">规格</th>
            <th class="col-num">数量</th>
            <th class="col-text">购买渠道</th>
            <th class="col-date">购买日期</th>
            <th class="col-price">价格</th>
            <th class="col-status">状态</th>
            <th class="col-note">备注</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pagedList" :key="item.id">
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.category || '—' }}</td>
            <td>{{ item.spec || '—' }}</td>
            <td class="col-num">× {{ item.stock }}</td>
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
            <td colspan="11" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ filteredTotal }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">尾页</button>
    </div>

    <OtherFormDialog
      v-model:visible="formVisible"
      :mode="dialogMode"
      :edit-record="editRecord"
      :saving="saving"
      @submit="handleSubmit"
    />

    <BoardDeleteDialog
      v-model:visible="deleteVisible"
      mode="single"
      :target-name="deleteTarget?.name"
      :count="1"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <ToolBatchImportDialog
      v-model:visible="importVisible"
      tool-type="other"
      :importing="importing"
      @import="handleImport"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'
import { useListTablePagination } from '@/composables/useListTablePagination'
import {
  addToolItem,
  deleteToolItem,
  formatToolTotalAmount,
  getOtherCategoryOptions,
  getOtherList,
  getOtherStock,
  sumItemPrices,
  toolInventory,
  updateToolItem,
} from './constants'
import BoardDeleteDialog from './components/BoardDeleteDialog.vue'
import OtherFormDialog from './components/OtherFormDialog.vue'
import ToolBatchImportDialog from './components/ToolBatchImportDialog.vue'

const router = useRouter()
const { showSuccess, showError } = useMessage()

const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const list = computed(() => {
  void toolInventory
  return getOtherList()
})

const categoryOptions = computed(() => {
  void toolInventory
  return getOtherCategoryOptions()
})

const searchForm = ref({
  category: '',
  spec: '',
  channel: '',
})

const resolveOtherCategory = (item) => String(item.category || item.toolType || '').trim()

const buildSearchFieldOptions = (field) => {
  void toolInventory.other
  const { category } = searchForm.value
  const categoryKey = category.trim()
  const set = new Set()
  getOtherList().forEach((item) => {
    if (categoryKey && resolveOtherCategory(item) !== categoryKey) return
    const value = String(item[field] || '').trim()
    if (value) set.add(value)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const specOptions = computed(() => buildSearchFieldOptions('spec'))
const channelOptions = computed(() => buildSearchFieldOptions('channel'))

const filteredList = computed(() => {
  const { category, spec, channel } = searchForm.value
  const specKey = spec.trim()
  const channelKey = channel.trim()
  return list.value.filter((item) => {
    if (category && resolveOtherCategory(item) !== category) return false
    if (specKey && (item.spec || '').trim() !== specKey) return false
    if (channelKey && (item.channel || '').trim() !== channelKey) return false
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
  searchForm.value = { category: '', spec: '', channel: '' }
}

watch(
  () => searchForm.value.category,
  () => {
    searchForm.value.spec = ''
    searchForm.value.channel = ''
  },
)

watch(searchForm, () => {
  currentPage.value = 1
}, { deep: true })

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

const stockTotal = computed(() => {
  void toolInventory
  return getOtherStock()
})

const formVisible = ref(false)
const dialogMode = ref('create')
const editRecord = ref(null)
const saving = ref(false)
const importing = ref(false)
const importVisible = ref(false)
const deleteVisible = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const formatPrice = (price) => {
  if (price === '' || price == null) return '—'
  const num = Number(price)
  if (Number.isNaN(num)) return '—'
  return num % 1 === 0 ? `¥${num}` : `¥${num.toFixed(2)}`
}

const statusTagClass = (status) => {
  if (status === '已售') return 'tag-sold'
  if (status === '送人') return 'tag-gift'
  if (status === '损耗') return 'tag-loss'
  return 'tag-using'
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
      addToolItem('other', item)
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
  deleteTarget.value = item
  deleteVisible.value = true
}

const handleSubmit = async (payload) => {
  saving.value = true
  try {
    const data = {
      name: payload.name,
      category: payload.category,
      spec: payload.spec,
      stock: payload.stock,
      channel: payload.channel,
      purchaseDate: payload.purchaseDate,
      price: payload.price,
      status: payload.status,
      note: payload.note,
    }

    if (payload.mode === 'edit') {
      updateToolItem('other', payload.id, data)
      showSuccess('编辑成功')
    } else {
      addToolItem('other', data)
      showSuccess('新增成功')
    }

    formVisible.value = false
  } catch (error) {
    showError(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    deleteToolItem('other', deleteTarget.value.id)
    showSuccess('删除成功')
    deleteVisible.value = false
    deleteTarget.value = null
  } catch (error) {
    showError(error?.message || '删除失败')
  } finally {
    deleting.value = false
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

.table-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.col-index {
  width: 5%;
}

.col-name {
  width: 12%;
}

.col-category {
  width: 9%;
}

.col-spec {
  width: 9%;
}

.col-num {
  width: 7%;
  color: var(--color-accent);
  font-weight: 600;
}

.col-text {
  width: 11%;
}

.col-date {
  width: 11%;
}

.col-price {
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

.tag-loss {
  background: #fef2f2;
  color: #dc2626;
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
