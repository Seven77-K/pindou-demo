<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <h3>权限设置</h3>
        <span class="header-badge">共 {{ users.length }} 个账号</span>
      </div>
      <el-button type="primary" @click="openCreate">新增账号</el-button>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <table class="data-table" :style="tableStyle">
        <thead>
          <tr>
            <th>序号</th>
            <th>账号</th>
            <th>显示名称</th>
            <th>密码</th>
            <th>功能权限</th>
            <th>角色</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pagedList" :key="item.id">
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td>{{ item.username }}</td>
            <td>{{ item.displayName || '—' }}</td>
            <td class="col-password">{{ item.password || '—' }}</td>
            <td>{{ permissionSummary(item) }}</td>
            <td>
              <span :class="['tag', isPrimaryAdmin(item) ? 'tag-super' : 'tag-admin']">
                {{ roleLabel(item) }}
              </span>
            </td>
            <td>
              <span :class="['tag', item.status ? 'tag-active' : 'tag-disabled']">
                {{ item.status ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ formatDate(item.createdAt) }}</td>
            <td>
              <span class="action-links">
                <a class="link" @click="openEdit(item)">编辑</a>
                <a
                  v-if="!isPrimaryAdmin(item)"
                  class="link link-danger"
                  @click="openDelete(item)"
                >删除</a>
              </span>
            </td>
          </tr>
          <tr v-if="!pagedList.length">
            <td colspan="9" class="empty-cell">暂无账号</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="pagination-total">共 {{ users.length }} 条</span>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">首页</button>
      <button type="button" class="page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">下一页</button>
      <button type="button" class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">尾页</button>
    </div>

    <UserAccountDialog
      v-model:visible="formVisible"
      :mode="dialogMode"
      :record="editingRecord"
      :saving="saving"
      @submit="handleSubmit"
    />

    <el-dialog draggable v-model="deleteVisible" title="确认删除" width="420px">
      <p class="confirm-text">
        确定要删除账号「<strong>{{ deleteTarget?.username }}</strong>」吗？
      </p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createUser, deleteUser, fetchUserById, fetchUsers, updateUser } from '@/api/auth'
import { useAuth } from '@/composables/useAuth'
import { useMessage } from '@/composables/useMessage'
import { DEFAULT_AUTH, isPrimaryAdmin as checkPrimaryAdmin } from '@/config/defaultAuth'
import { summarizePermissions } from '@/config/permissions'
import { useListTablePagination } from '@/composables/useListTablePagination'
import UserAccountDialog from './components/UserAccountDialog.vue'

const { showSuccess, showError } = useMessage()
const { tryUpgradeLocalSession } = useAuth()

const users = ref([])
const { tableWrapRef, pageSize, currentPage, tableStyle } = useListTablePagination()

const totalPages = computed(() => Math.max(1, Math.ceil(users.value.length / pageSize.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return users.value.slice(start, start + pageSize.value)
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

const formVisible = ref(false)
const deleteVisible = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const deleting = ref(false)
const editingId = ref(null)
const editingRecord = ref(null)
const deleteTarget = ref(null)

const isPrimaryAdmin = checkPrimaryAdmin
const roleLabel = (item) => (checkPrimaryAdmin(item) ? '超级管理员' : '管理员')
const permissionSummary = (item) =>
  checkPrimaryAdmin(item) ? '权限管理' : summarizePermissions(item.permissions)

const formatDate = (value) => {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 19)
}

const loadUsers = async () => {
  try {
    await tryUpgradeLocalSession()
    users.value = await fetchUsers()
  } catch (error) {
    showError(error.message || '加载账号失败')
  }
}

const openCreate = () => {
  dialogMode.value = 'create'
  editingId.value = null
  editingRecord.value = null
  formVisible.value = true
}

const openEdit = async (item) => {
  dialogMode.value = 'edit'
  editingId.value = item.id
  editingRecord.value = { ...item }

  try {
    const detail = await fetchUserById(item.id)
    editingRecord.value = { ...item, ...detail }
  } catch {
    // 保留列表数据
  }

  formVisible.value = true
}

const handleSubmit = async (payload) => {
  if (!payload.username) {
    showError('请输入账号')
    return
  }
  if (dialogMode.value === 'create' && payload.username === DEFAULT_AUTH.username) {
    showError('不能创建 admin 账号')
    return
  }
  if (dialogMode.value === 'create' && !payload.password) {
    showError('请输入密码')
    return
  }

  saving.value = true
  try {
    const data = {
      username: payload.username,
      displayName: payload.displayName,
      status: payload.status,
      permissions: payload.permissions,
    }
    if (payload.password) {
      data.password = payload.password
    }

    if (dialogMode.value === 'edit') {
      await updateUser(editingId.value, data)
      showSuccess('编辑成功')
    } else {
      data.password = payload.password
      await createUser(data)
      showSuccess('新增成功')
    }

    formVisible.value = false
    currentPage.value = 1
    await loadUsers()
  } catch (error) {
    showError(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const openDelete = (item) => {
  deleteTarget.value = item
  deleteVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteUser(deleteTarget.value.id)
    showSuccess('删除成功')
    deleteVisible.value = false
    deleteTarget.value = null
    await loadUsers()
  } catch (error) {
    showError(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.page-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 20px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.page-header {
  display: flex;
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

.table-wrap {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.tag-super {
  background: #f3ebff;
  color: #9333ea;
}

.tag-admin {
  background: #eef6ff;
  color: #2563eb;
}

.tag-active {
  background: #e8f8f4;
  color: #0d9488;
}

.tag-disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.action-links {
  display: inline-flex;
  gap: 10px;
}

.link {
  color: var(--color-accent);
  cursor: pointer;
}

.link-danger {
  color: #e85d6a;
}

.empty-cell {
  padding: 32px 12px;
  color: var(--color-text-secondary);
}

.col-password {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: var(--color-text-regular);
}

.confirm-text {
  margin: 0;
  line-height: 1.6;
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
