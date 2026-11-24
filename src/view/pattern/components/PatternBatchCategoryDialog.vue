<template>
  <el-dialog
    draggable :model-value="visible"
    title="批量修改"
    width="440px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @update:model-value="handleCancel"
  >
    <p class="confirm-text">
      将修改已选的 <strong>{{ count }}</strong> 条图纸；留空的字段不修改。
    </p>

    <div class="field-list">
      <div class="field">
        <label class="field-label">图纸类别</label>
        <FieldCombobox
          v-model="patternCategory"
          :options="categoryOptions"
          placeholder="请选择或输入类别"
          clear-label="清除类别"
          toggle-label="展开类别列表"
        />
      </div>

      <div class="field">
        <label class="field-label">图纸作者</label>
        <FieldCombobox
          v-model="author"
          :options="authorOptions"
          placeholder="请选择或输入作者"
          clear-label="清除作者"
          toggle-label="展开作者列表"
        />
      </div>

      <div class="field">
        <label class="field-label">图纸日期</label>
        <el-date-picker
          v-model="date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          clearable
          class="date-picker"
        />
      </div>

      <div class="field">
        <label class="field-label">{{ amountLabel }}</label>
        <el-input
          v-model="amount"
          type="text"
          inputmode="decimal"
          :placeholder="`请输入${amountLabel}`"
          clearable
        />
      </div>
    </div>

    <template #footer>
      <el-button :disabled="loading" @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!canSubmit" @click="handleConfirm">
        {{ loading ? '修改中…' : '确定修改' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import FieldCombobox from '@/components/FieldCombobox.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  categoryOptions: { type: Array, default: () => [] },
  authorOptions: { type: Array, default: () => [] },
  /** member：金额 valueAmount；normal：价格 price */
  patternKind: { type: String, default: 'member' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const patternCategory = ref('')
const author = ref('')
const date = ref('')
const amount = ref('')

const amountLabel = computed(() => (props.patternKind === 'normal' ? '价格' : '金额'))

const canSubmit = computed(
  () =>
    Boolean(
      String(patternCategory.value || '').trim() ||
        String(author.value || '').trim() ||
        String(date.value || '').trim() ||
        String(amount.value || '').trim(),
    ),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    patternCategory.value = ''
    author.value = ''
    date.value = ''
    amount.value = ''
  },
)

const handleCancel = () => {
  if (props.loading) return
  emit('update:visible', false)
}

const parseAmount = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return null
  const num = Number(text)
  if (!Number.isFinite(num) || num < 0) return NaN
  return Math.round(num * 100) / 100
}

const handleConfirm = () => {
  if (props.loading || !canSubmit.value) return
  const nextCategory = String(patternCategory.value || '').trim()
  const nextAuthor = String(author.value || '').trim()
  const nextDate = String(date.value || '').trim()
  const amountText = String(amount.value || '').trim()
  const editAmount = Boolean(amountText)
  emit('confirm', {
    editCategory: Boolean(nextCategory),
    editAuthor: Boolean(nextAuthor),
    editDate: Boolean(nextDate),
    editAmount,
    patternCategory: nextCategory,
    author: nextAuthor,
    date: nextDate,
    amount: editAmount ? parseAmount(amountText) : null,
  })
}
</script>

<style scoped>
.confirm-text {
  margin: 0 0 16px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.6;
}

.confirm-text strong {
  color: var(--el-text-color-primary);
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 500;
}

.date-picker {
  width: 100%;
}
</style>
