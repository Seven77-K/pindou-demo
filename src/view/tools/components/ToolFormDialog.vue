<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ mode === 'edit' ? `编辑${categoryLabel}` : `新增${categoryLabel}` }}</h4>
            <p class="header-sub">填写名称、规格和数量</p>
          </div>
          <button type="button" class="dialog-close" :disabled="saving" @click="handleClose">
            ×
          </button>
        </div>

        <form class="dialog-form" @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="form-item form-span-2">
              <label class="label-required">名称</label>
              <el-input v-model="form.name" placeholder="请输入名称" clearable />
            </div>

            <div class="form-item form-span-2">
              <label>规格</label>
              <el-input v-model="form.spec" clearable />
            </div>

            <div class="form-item form-span-2">
              <label class="label-required">数量</label>
              <el-input-number v-model="form.stock" :min="1" :max="9999" :step="1" step-strictly
                controls-position="right" class="field-full" />
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
import { reactive, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  categoryLabel: { type: String, default: '工具' },
  saving: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])

const { showError } = useMessage()

const createForm = () => ({
  name: '',
  spec: '',
  stock: 1,
})

const form = reactive(createForm())

const resetForm = () => {
  Object.assign(form, createForm())
}

const fillEditForm = () => {
  const record = props.editRecord
  if (!record) return
  form.name = record.name || ''
  form.spec = record.spec || ''
  form.stock = record.stock || 1
}

watch(
  () => [props.visible, props.mode, props.editRecord],
  ([visible]) => {
    if (!visible) {
      if (!props.saving) resetForm()
      return
    }
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
  if (!form.name.trim()) {
    showError('请输入名称')
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
    spec: form.spec,
    stock: form.stock,
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
  width: 420px;
  max-width: 92vw;
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
  padding: 18px 20px 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.form-span-2 {
  grid-column: span 1;
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
.form-item :deep(.el-input-number) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel,
.btn-primary {
  min-width: 88px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-cancel:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-cancel:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
