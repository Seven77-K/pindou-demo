<template>
  <el-dialog
    draggable :model-value="visible"
    title="转为会员图纸"
    width="440px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @update:model-value="handleCancel"
  >
    <p v-if="mode === 'single'" class="confirm-text">
      将普通图纸「<strong>{{ targetName }}</strong>」转为会员图纸。转换后会从普通图纸列表移除，并出现在会员图纸中。
    </p>
    <p v-else class="confirm-text">
      将已选的 <strong>{{ count }}</strong> 条普通图纸转为会员图纸。转换后会从普通图纸列表移除，并出现在会员图纸中。
    </p>

    <div class="form-item">
      <label class="label-required">购买人</label>
      <el-select v-model="buyer" placeholder="请选择购买人" class="field-full">
        <el-option v-for="item in buyerOptions" :key="item" :label="item" :value="item" />
      </el-select>
    </div>

    <div v-if="mode === 'single'" class="form-item">
      <label>图纸类型</label>
      <div class="type-toggle">
        <button
          v-for="opt in patternTypeOptions"
          :key="opt.value"
          type="button"
          class="type-btn"
          :class="{ 'type-btn-active': type === opt.value }"
          @click="type = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="field-hint">默认保留原图纸类型，也可在此调整</p>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">确认转换</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { buyerOptions, patternTypeOptions } from '@/composables/usePatternData'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'single' },
  targetName: { type: String, default: '' },
  count: { type: Number, default: 0 },
  defaultBuyer: { type: String, default: '' },
  defaultType: { type: String, default: 'free' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const buyer = ref('')
const type = ref('free')

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    buyer.value = props.defaultBuyer || buyerOptions[0] || ''
    type.value = props.defaultType || 'free'
  },
)

const handleCancel = () => {
  if (props.loading) return
  emit('update:visible', false)
}

const handleConfirm = () => {
  if (!buyer.value) return
  emit('confirm', { buyer: buyer.value, type: type.value })
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

.form-item {
  margin-bottom: 14px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.label-required::after {
  content: ' *';
  color: #e85d6a;
}

.field-full {
  width: 100%;
}

.type-toggle {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.type-btn-active {
  border-color: var(--color-accent);
  background: #fff5f7;
  color: var(--color-accent);
  font-weight: 600;
}

.field-hint {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
