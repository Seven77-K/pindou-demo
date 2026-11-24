<template>
  <el-dialog
    draggable
    :model-value="visible"
    title="批量下载"
    width="440px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @update:model-value="handleCancel"
  >
    <p class="confirm-text">
      将下载已选的 <strong>{{ count }}</strong> 条图纸为 Excel 表格。
    </p>

    <div class="option-block">
      <p class="option-title">是否同时下载图片？</p>
      <p class="option-hint">选「否」只导出表格，不打包图片，速度更快。</p>
      <div class="option-radios">
        <label class="radio-row">
          <input
            v-model="includeImages"
            type="radio"
            :value="true"
            class="radio-input"
            :disabled="loading"
          />
          <span>是，下载图片</span>
        </label>
        <label class="radio-row">
          <input
            v-model="includeImages"
            type="radio"
            :value="false"
            class="radio-input"
            :disabled="loading"
          />
          <span>否，仅下载表格</span>
        </label>
      </div>
    </div>

    <template #footer>
      <el-button :disabled="loading" @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">
        {{ loading ? '下载中…' : confirmLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const includeImages = ref(true)

const confirmLabel = computed(() =>
  includeImages.value ? '开始下载（含图片）' : '开始下载（仅表格）',
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) includeImages.value = true
  },
)

const handleCancel = () => {
  if (props.loading) return
  emit('update:visible', false)
}

const handleConfirm = () => {
  if (props.loading) return
  emit('confirm', { includeImages: includeImages.value === true })
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

.option-block {
  padding: 12px 14px;
  border: 1px solid #f0e8ec;
  border-radius: 10px;
  background: #fffafb;
}

.option-title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.option-hint {
  margin: 6px 0 12px;
  color: #9a8790;
  font-size: 12px;
  line-height: 1.5;
}

.option-radios {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  cursor: pointer;
}

.radio-input {
  flex-shrink: 0;
}
</style>
