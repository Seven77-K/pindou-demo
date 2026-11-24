<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ mode === 'edit' ? '编辑工具' : '新增工具' }}</h4>
            <p class="header-sub">填写其他工具信息，保存后会出现在列表中</p>
          </div>
          <button type="button" class="dialog-close" :disabled="saving" @click="handleClose">
            ×
          </button>
        </div>

        <form class="dialog-form" @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="form-item form-span-2">
              <label class="label-required">工具名称</label>
              <el-input v-model="form.name" placeholder="请输入工具名称" clearable />
            </div>

            <div class="form-item">
              <label>类别</label>
              <el-select v-model="form.category" filterable allow-create default-first-option clearable
                :filter-method="filterCategory" placeholder="请选择或输入类别" popper-class="dialog-field-popper"
                class="field-full" @change="handleCategoryChange" @visible-change="handleCategoryVisibleChange">
                <el-option v-for="opt in filteredCategoryOptions" :key="opt.value" :label="opt.label"
                  :value="opt.value" />
              </el-select>
            </div>

            <div class="form-item">
              <label>规格</label>
              <FieldCombobox v-model="form.spec" :options="specOptions" placeholder="请选择或输入规格" />
            </div>

            <div class="form-item">
              <label class="label-required">数量</label>
              <el-input-number v-model="form.stock" :min="1" :max="9999" :step="1" step-strictly
                controls-position="right" class="field-full" />
            </div>

            <div class="form-item">
              <label>购买渠道</label>
              <FieldCombobox v-model="form.channel" :options="channelOptions" placeholder="请选择或输入购买渠道" />
            </div>

            <div class="form-item">
              <label>购买日期</label>
              <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期"
                popper-class="dialog-field-popper" clearable class="field-full" />
            </div>

            <div class="form-item">
              <label>价格</label>
              <el-input-number v-model="form.price" :min="0" :max="999999" :precision="2" :step="0.01"
                :step-strictly="false" controls-position="right" placeholder="0.00" class="field-full" />
            </div>

            <div class="form-item">
              <label>状态</label>
              <el-select v-model="form.status" placeholder="请选择状态" class="field-full">
                <el-option v-for="opt in BOARD_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>

            <div class="form-item form-span-2">
              <label>备注</label>
              <el-input v-model="form.note" type="textarea" :rows="3" placeholder="选填，可记录店铺、链接等信息" resize="none" />
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="handleClose">
              取消
            </button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中…' : '确定' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import FieldCombobox from '@/components/FieldCombobox.vue'
import { useMessage } from '@/composables/useMessage'
import { BOARD_STATUS_OPTIONS, getOtherCategoryOptions, getOtherList, toolInventory } from '../constants'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  saving: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])

const { showError } = useMessage()

const categoryFilterQuery = ref('')
const categorySelectedFromList = ref(false)

const categoryOptions = computed(() => {
  void toolInventory
  return getOtherCategoryOptions()
})

const filteredCategoryOptions = computed(() => {
  const keyword = categoryFilterQuery.value.trim().toLowerCase()
  const options = categoryOptions.value
  if (!keyword) return options
  return options.filter((item) => item.value.toLowerCase().includes(keyword))
})

const filterCategory = (query) => {
  categoryFilterQuery.value = query
}

const commitCategoryInput = () => {
  if (categorySelectedFromList.value) return
  const query = categoryFilterQuery.value.trim()
  if (query) {
    form.category = query
  }
}

const handleCategoryChange = () => {
  categorySelectedFromList.value = true
  categoryFilterQuery.value = ''
}

const handleCategoryVisibleChange = (visible) => {
  if (visible) {
    categorySelectedFromList.value = false
    return
  }
  commitCategoryInput()
  categoryFilterQuery.value = ''
}

const createForm = () => ({
  name: '',
  category: '',
  spec: '',
  stock: 1,
  channel: '',
  purchaseDate: '',
  price: null,
  status: '在用',
  note: '',
})

const form = reactive(createForm())

const buildFieldOptions = (field) => {
  void toolInventory
  const set = new Set()
  getOtherList().forEach((item) => {
    const value = String(item[field] || '').trim()
    if (value) set.add(value)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const specOptions = computed(() => {
  const set = new Set(buildFieldOptions('spec'))
  const current = form.spec?.trim()
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const channelOptions = computed(() => {
  const set = new Set(buildFieldOptions('channel'))
  const current = form.channel?.trim()
  if (current) set.add(current)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const resetForm = () => {
  Object.assign(form, createForm())
  categoryFilterQuery.value = ''
  categorySelectedFromList.value = false
}

const fillEditForm = () => {
  const record = props.editRecord
  if (!record) return

  form.name = record.name || ''
  form.category = record.category || record.toolType || ''
  form.spec = record.spec || ''
  form.stock = record.stock || 1
  form.channel = record.channel || ''
  form.purchaseDate = record.purchaseDate || ''
  form.price = record.price === '' || record.price == null ? null : record.price
  form.status = record.status || '在用'
  form.note = record.note || ''
}

watch(
  () => [props.visible, props.mode, props.editRecord],
  ([visible]) => {
    if (!visible) {
      if (!props.saving) resetForm()
      return
    }
    categoryFilterQuery.value = ''
    categorySelectedFromList.value = false
    if (props.mode === 'edit') {
      fillEditForm()
    } else {
      resetForm()
    }
  },
)

const handleClose = () => {
  if (props.saving) return
  emit('update:visible', false)
}

const handleSubmit = () => {
  commitCategoryInput()

  if (!form.name.trim()) {
    showError('请输入工具名称')
    return
  }
  if (!form.stock || form.stock < 1) {
    showError('请填写有效数量')
    return
  }

  emit('submit', {
    mode: props.mode,
    id: props.editRecord?.id,
    name: form.name,
    category: String(form.category || '').trim(),
    spec: form.spec,
    stock: form.stock,
    channel: form.channel,
    purchaseDate: form.purchaseDate,
    price: form.price,
    status: form.status,
    note: form.note,
  })
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
  background: rgba(61, 42, 50, 0.45);
  backdrop-filter: blur(2px);
}

.dialog-box {
  width: 500px;
  max-width: 92vw;
  max-height: 90vh;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(168, 56, 88, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, #fff 0%, var(--color-pale) 100%);
}

.header-text h4 {
  margin: 0 0 4px;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-close {
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

.dialog-close:hover:not(:disabled) {
  background: #fff;
  color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(168, 56, 88, 0.12);
}

.dialog-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-form {
  max-height: calc(90vh - 140px);
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

.field-full {
  width: 100%;
}

.form-item :deep(.el-input__wrapper),
.form-item :deep(.el-input-number),
.form-item :deep(.el-date-editor),
.form-item :deep(.el-select) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.btn-primary,
.btn-cancel {
  min-width: 88px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-cancel:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
.dialog-field-popper {
  z-index: 2100 !important;
}
</style>
