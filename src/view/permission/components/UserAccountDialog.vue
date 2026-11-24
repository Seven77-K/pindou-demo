<template>
  <el-dialog
    draggable :model-value="visible"
    :title="mode === 'edit' ? '编辑账号' : '新增账号'"
    width="760px"
    class="account-dialog"
    :close-on-click-modal="false"
    @close="emit('update:visible', false)"
  >
    <div class="dialog-body">
      <section class="basic-panel">
        <h4 class="panel-title">基本信息</h4>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="basic-form">
          <el-form-item label="账号" prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入账号"
              :disabled="editingPrimaryAdmin"
              clearable
            />
          </el-form-item>
          <el-form-item label="显示名称">
            <el-input v-model="form.displayName" placeholder="同时也是购买人名称" clearable />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              type="text"
              :placeholder="mode === 'create' ? '请输入密码（至少 6 位）' : '不修改请留空'"
              class="password-input"
            />
          </el-form-item>
          <el-form-item v-if="editingPrimaryAdmin" label="角色">
            <el-input model-value="超级管理员" disabled />
          </el-form-item>
          <el-form-item v-else label="状态">
            <el-select v-model="form.status" class="field-full">
              <el-option label="启用" :value="true" />
              <el-option label="禁用" :value="false" />
            </el-select>
          </el-form-item>
        </el-form>
      </section>

      <section v-if="!editingPrimaryAdmin" class="perm-panel">
        <div class="perm-toolbar">
          <h4 class="panel-title">功能权限</h4>
          <div class="perm-actions">
            <button type="button" class="btn-text" @click="selectAllPermissions">全选</button>
            <span class="divider">|</span>
            <button type="button" class="btn-text" @click="clearAllPermissions">清空</button>
            <span class="perm-count">已选 {{ selectedCount }} / {{ ALL_PERMISSION_KEYS.length }}</span>
          </div>
        </div>

        <div class="perm-scroll">
          <div v-for="group in PERMISSION_GROUPS" :key="group.key" class="perm-group">
            <div class="perm-group-head">
              <el-checkbox
                :model-value="isGroupChecked(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @change="(val) => toggleGroup(group, val)"
              >
                {{ group.label }}
              </el-checkbox>
            </div>
            <div class="perm-grid">
              <el-checkbox-group v-model="form.permissions">
                <el-checkbox
                  v-for="item in getGroupCheckboxPermissions(group)"
                  :key="item.key"
                  :label="item.key"
                >
                  {{ item.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
            <div v-if="group.key === 'pattern'" class="perm-radio-block">
              <span class="perm-radio-label">默认购买人（单选）</span>
              <el-radio-group v-model="defaultMemberBuyerKey" class="perm-radio-group">
                <el-radio
                  v-for="item in defaultMemberBuyerOptions"
                  :key="item.key"
                  :value="item.key"
                >
                  {{ item.label.replace('默认购买人-', '') }}
                </el-radio>
              </el-radio-group>
            </div>
            <div v-if="group.key === 'cost'" class="perm-radio-block">
              <span class="perm-radio-label">普通图纸金额（单选）</span>
              <el-radio-group v-model="defaultCostPatternBuyerKey" class="perm-radio-group">
                <el-radio
                  v-for="item in defaultCostPatternBuyerOptions"
                  :key="item.key"
                  :value="item.key"
                >
                  {{ item.name }}
                </el-radio>
              </el-radio-group>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ALL_PERMISSION_KEYS,
  COST_PATTERN_BUYERS,
  COST_PATTERN_BUYER_PERMISSION_KEYS,
  DEFAULT_MEMBER_BUYER_PERMISSION_KEYS,
  getDefaultPermissions,
  normalizeAccountPermissions,
  PERMISSION_GROUPS,
} from '@/config/permissions'
import { isPrimaryAdmin as checkPrimaryAdmin } from '@/config/defaultAuth'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  saving: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref(null)

const form = reactive({
  username: '',
  displayName: '',
  password: '',
  status: true,
  permissions: getDefaultPermissions(),
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
}

const editingPrimaryAdmin = computed(
  () => props.mode === 'edit' && checkPrimaryAdmin({ username: form.username }),
)

const selectedCount = computed(() => form.permissions.length)

const defaultMemberBuyerKey = ref(DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0])
const defaultCostPatternBuyerKey = ref(COST_PATTERN_BUYER_PERMISSION_KEYS[0])

const defaultMemberBuyerOptions = computed(() => {
  const group = PERMISSION_GROUPS.find((item) => item.key === 'pattern')
  return (group?.permissions || []).filter((item) =>
    DEFAULT_MEMBER_BUYER_PERMISSION_KEYS.includes(item.key),
  )
})

const defaultCostPatternBuyerOptions = computed(() =>
  COST_PATTERN_BUYERS.map((item) => ({
    key: item.permission,
    label: `普通图纸金额-${item.name}`,
  })),
)

const syncPermissionsFromDefaultMemberBuyerKey = (key) => {
  const nextKey = key || DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0]
  form.permissions = form.permissions.filter(
    (item) => !DEFAULT_MEMBER_BUYER_PERMISSION_KEYS.includes(item),
  )
  if (form.permissions.includes('pattern.view')) {
    form.permissions.push(nextKey)
  }
}

const syncPermissionsFromDefaultCostPatternBuyerKey = (key) => {
  const nextKey = key || COST_PATTERN_BUYER_PERMISSION_KEYS[0]
  form.permissions = form.permissions.filter(
    (item) => !COST_PATTERN_BUYER_PERMISSION_KEYS.includes(item),
  )
  if (form.permissions.includes('cost.view')) {
    form.permissions.push(nextKey)
  }
}

const syncDefaultMemberBuyerKeyFromPermissions = () => {
  const hit = DEFAULT_MEMBER_BUYER_PERMISSION_KEYS.find((key) => form.permissions.includes(key))
  defaultMemberBuyerKey.value = hit || DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0]
}

const syncDefaultCostPatternBuyerKeyFromPermissions = () => {
  const hit = COST_PATTERN_BUYER_PERMISSION_KEYS.find((key) => form.permissions.includes(key))
  defaultCostPatternBuyerKey.value = hit || COST_PATTERN_BUYER_PERMISSION_KEYS[0]
}

const syncExclusiveBuyerKeysFromPermissions = () => {
  syncDefaultMemberBuyerKeyFromPermissions()
  syncDefaultCostPatternBuyerKeyFromPermissions()
}

const buildPermissionsForSave = () => {
  const perms = form.permissions.filter(
    (key) =>
      !DEFAULT_MEMBER_BUYER_PERMISSION_KEYS.includes(key) &&
      !COST_PATTERN_BUYER_PERMISSION_KEYS.includes(key),
  )
  if (form.permissions.includes('pattern.view')) {
    perms.push(defaultMemberBuyerKey.value || DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0])
  }
  if (form.permissions.includes('cost.view')) {
    perms.push(defaultCostPatternBuyerKey.value || COST_PATTERN_BUYER_PERMISSION_KEYS[0])
  }
  return normalizeAccountPermissions(perms)
}

watch(defaultMemberBuyerKey, (key) => {
  if (!props.visible || !key) return
  syncPermissionsFromDefaultMemberBuyerKey(key)
})

watch(defaultCostPatternBuyerKey, (key) => {
  if (!props.visible || !key) return
  syncPermissionsFromDefaultCostPatternBuyerKey(key)
})

const getGroupCheckboxPermissions = (group) => {
  if (group.key === 'pattern') {
    return group.permissions.filter(
      (item) => !DEFAULT_MEMBER_BUYER_PERMISSION_KEYS.includes(item.key),
    )
  }
  if (group.key === 'cost') {
    return group.permissions.filter(
      (item) => !COST_PATTERN_BUYER_PERMISSION_KEYS.includes(item.key),
    )
  }
  return group.permissions
}

const isExclusiveGroupChecked = (group, exclusiveKeys) => {
  const regularOk = getGroupCheckboxPermissions(group).every((item) =>
    form.permissions.includes(item.key),
  )
  const exclusiveOk = exclusiveKeys.some((key) => form.permissions.includes(key))
  return regularOk && exclusiveOk
}

const isExclusiveGroupIndeterminate = (group, exclusiveKeys) => {
  const regular = getGroupCheckboxPermissions(group)
  const regularSelected = regular.filter((item) => form.permissions.includes(item.key)).length
  const exclusiveSelected = exclusiveKeys.some((key) => form.permissions.includes(key))
  const total = regular.length + 1
  const selected = regularSelected + (exclusiveSelected ? 1 : 0)
  return selected > 0 && selected < total
}

const isGroupChecked = (group) => {
  if (group.key === 'pattern') {
    return isExclusiveGroupChecked(group, DEFAULT_MEMBER_BUYER_PERMISSION_KEYS)
  }
  if (group.key === 'cost') {
    return isExclusiveGroupChecked(group, COST_PATTERN_BUYER_PERMISSION_KEYS)
  }
  return group.permissions.every((item) => form.permissions.includes(item.key))
}

const isGroupIndeterminate = (group) => {
  if (group.key === 'pattern') {
    return isExclusiveGroupIndeterminate(group, DEFAULT_MEMBER_BUYER_PERMISSION_KEYS)
  }
  if (group.key === 'cost') {
    return isExclusiveGroupIndeterminate(group, COST_PATTERN_BUYER_PERMISSION_KEYS)
  }
  const selected = group.permissions.filter((item) => form.permissions.includes(item.key)).length
  return selected > 0 && selected < group.permissions.length
}

const toggleGroup = (group, checked) => {
  const keys = group.permissions.map((item) => item.key)
  if (checked) {
    form.permissions = normalizeAccountPermissions([...form.permissions, ...keys])
  } else {
    form.permissions = form.permissions.filter((key) => !keys.includes(key))
  }
  if (group.key === 'pattern' || group.key === 'cost') {
    syncExclusiveBuyerKeysFromPermissions()
  }
}

const selectAllPermissions = () => {
  form.permissions = getDefaultPermissions()
  syncExclusiveBuyerKeysFromPermissions()
}

const clearAllPermissions = () => {
  form.permissions = []
  defaultMemberBuyerKey.value = DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0]
  defaultCostPatternBuyerKey.value = COST_PATTERN_BUYER_PERMISSION_KEYS[0]
}

const resetForm = () => {
  form.username = ''
  form.displayName = ''
  form.password = ''
  form.status = true
  form.permissions = getDefaultPermissions()
  syncExclusiveBuyerKeysFromPermissions()
  formRef.value?.clearValidate()
}

const fillForm = (record) => {
  if (!record) {
    resetForm()
    return
  }
  form.username = record.username || ''
  form.displayName = record.displayName || ''
  form.password = record.password || ''
  form.status = record.status !== false
  form.permissions = normalizeAccountPermissions(record.permissions || getDefaultPermissions())
  syncExclusiveBuyerKeysFromPermissions()
}

watch(
  () => [props.visible, props.mode, props.record],
  ([visible]) => {
    if (!visible) return
    if (props.mode === 'edit' && props.record) {
      fillForm(props.record)
    } else {
      resetForm()
    }
  },
)

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const permissions = editingPrimaryAdmin.value ? [] : buildPermissionsForSave()

  emit('submit', {
    username: form.username.trim(),
    displayName: form.displayName.trim(),
    password: form.password,
    status: form.status,
    permissions,
  })
}
</script>

<style scoped>
.dialog-body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  min-height: 420px;
}

.basic-panel,
.perm-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-title {
  margin: 0 0 14px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.basic-form {
  flex: 1;
}

.perm-panel {
  padding-left: 20px;
  border-left: 1px solid var(--color-border);
}

.perm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.perm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.btn-text {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 12px;
  cursor: pointer;
}

.btn-text:hover {
  color: var(--color-accent-deep);
}

.divider {
  color: var(--color-border);
}

.perm-count {
  margin-left: 4px;
  color: var(--color-text-secondary);
}

.perm-scroll {
  flex: 1;
  min-height: 0;
  max-height: 420px;
  padding-right: 4px;
  overflow-y: auto;
}

.perm-group {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-pale);
}

.perm-group-head {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-border);
}

.perm-grid :deep(.el-checkbox-group) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.perm-grid :deep(.el-checkbox) {
  margin-right: 0;
  height: auto;
}

.perm-grid :deep(.el-checkbox__label) {
  font-size: 13px;
  white-space: normal;
  line-height: 1.4;
}

.perm-radio-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.perm-radio-label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.perm-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.perm-radio-group :deep(.el-radio) {
  margin-right: 0;
  height: auto;
}

.field-full {
  width: 100%;
}

.password-input :deep(.el-input__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.04em;
}

@media (max-width: 720px) {
  .dialog-body {
    grid-template-columns: 1fr;
  }

  .perm-panel {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
  }
}
</style>
