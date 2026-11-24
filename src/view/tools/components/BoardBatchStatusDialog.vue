<template>
  <el-dialog
    draggable :model-value="visible"
    title="批量修改状态"
    width="420px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @update:model-value="handleCancel"
    @open="resetForm"
  >
    <p class="confirm-text">
      已选 <strong>{{ count }}</strong> 条豆板，请选择要修改的状态：
    </p>
    <el-select v-model="selectedStatus" placeholder="请选择状态" class="status-select">
      <el-option v-for="opt in BOARD_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!selectedStatus" @click="emit('confirm', selectedStatus)">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { BOARD_STATUS_OPTIONS } from '../constants'

const props = defineProps({
  visible: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const selectedStatus = ref('')

const resetForm = () => {
  selectedStatus.value = ''
}

const handleCancel = () => {
  if (props.loading) return
  emit('update:visible', false)
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

.status-select {
  width: 100%;
}
</style>
