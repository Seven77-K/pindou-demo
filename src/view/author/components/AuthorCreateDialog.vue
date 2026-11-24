<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>新增作者</h4>
            <p class="header-sub">填写会员作者信息，保存后可在会员图纸上传时选择</p>
          </div>
          <button type="button" class="dialog-close" :disabled="saving" @click="handleClose">×</button>
        </div>

        <form class="dialog-form" @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="form-item form-span-2">
              <label class="label-required">作者名称</label>
              <el-input v-model="form.name" placeholder="请输入作者名称" clearable />
            </div>

            <div class="form-item">
              <label class="label-required">购买日期</label>
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
              <label class="label-required">购买金额</label>
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
              <label>购买人</label>
              <div class="form-fixed-value">{{ buyer || '—' }}</div>
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="handleClose">取消</button>
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
import { reactive, ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'

const props = defineProps({
  visible: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  buyer: { type: String, default: '' },
})

const emit = defineEmits(['update:visible', 'submit'])

const { showError } = useMessage()

const createForm = () => {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return {
    name: '',
    date: `${today.getFullYear()}-${month}-${day}`,
    amount: null,
  }
}

const form = reactive(createForm())

const resetForm = () => {
  Object.assign(form, createForm())
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    } else if (!props.saving) {
      resetForm()
    }
  },
)

const handleClose = () => {
  if (props.saving) return
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (props.saving) return

  if (!form.name.trim()) {
    showError('请输入作者名称')
    return
  }
  if (!form.date) {
    showError('请选择购买日期')
    return
  }
  if (!form.amount || form.amount <= 0) {
    showError('请填写有效购买金额')
    return
  }

  emit('submit', {
    name: form.name.trim(),
    date: form.date,
    amount: form.amount,
    buyer: props.buyer,
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
  width: 460px;
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
}

.dialog-form {
  padding: 18px 20px 20px;
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

.form-fixed-value {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-pale);
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 32px;
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

.btn-primary:disabled,
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
.dialog-field-popper {
  z-index: 2100 !important;
}
</style>
