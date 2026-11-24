<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="btn-back" @click="goBack">← 返回</button>
        <h3>{{ category.name }}</h3>
        <span class="header-badge">共 {{ stockTotal }} 件</span>
      </div>
      <el-button type="primary" @click="openCreate">新增</el-button>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th class="col-index">序号</th>
            <th class="col-name">名称</th>
            <th class="col-spec">规格</th>
            <th class="col-num">数量</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pagedList" :key="item.id">
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.spec || '—' }}</td>
            <td class="col-num">× {{ item.stock }}</td>
            <td>
              <span class="action-links">
                <a class="link" @click="openEdit(item)">编辑</a>
                <a class="link link-danger" @click="openDeleteConfirm(item)">删除</a>
              </span>
            </td>
          </tr>
          <tr v-if="!pagedList.length">
            <td colspan="5" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ listTotal }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">尾页</button>
    </div>

    <ToolFormDialog
      v-model:visible="formVisible"
      :mode="dialogMode"
      :category-label="category.name"
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
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'
import { useListTablePagination } from '@/composables/useListTablePagination'
import {
  addToolItem,
  deleteToolItem,
  getToolList,
  getToolStock,
  TOOL_CATEGORIES,
  toolInventory,
  updateToolItem,
} from './constants'
import BoardDeleteDialog from './components/BoardDeleteDialog.vue'
import ToolFormDialog from './components/ToolFormDialog.vue'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useMessage()

const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const categoryKey = computed(() => String(route.meta.categoryKey || ''))

const category = computed(() => TOOL_CATEGORIES[categoryKey.value] || { name: '工具', icon: '◦' })

const list = computed(() => {
  void toolInventory
  return getToolList(categoryKey.value)
})

const listTotal = computed(() => list.value.length)

const totalPages = computed(() => Math.max(1, Math.ceil(listTotal.value / pageSize.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

const stockTotal = computed(() => {
  void toolInventory
  return getToolStock(categoryKey.value)
})

const formVisible = ref(false)
const dialogMode = ref('create')
const editRecord = ref(null)
const saving = ref(false)
const deleteVisible = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const openCreate = () => {
  dialogMode.value = 'create'
  editRecord.value = null
  formVisible.value = true
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
    if (payload.mode === 'edit') {
      updateToolItem(categoryKey.value, payload.id, payload)
      showSuccess('已保存')
    } else {
      addToolItem(categoryKey.value, payload)
      showSuccess('已新增')
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
    deleteToolItem(categoryKey.value, deleteTarget.value.id)
    showSuccess('已删除')
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

.btn-back {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
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

.table-wrap {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.col-index {
  width: 10%;
}

.col-name {
  width: 28%;
}

.col-spec {
  width: 32%;
}

.col-num {
  width: 14%;
  color: var(--color-accent);
  font-weight: 600;
}

.col-action {
  width: 16%;
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
