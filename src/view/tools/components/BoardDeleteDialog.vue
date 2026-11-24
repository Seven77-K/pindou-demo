<template>
  <el-dialog draggable :model-value="visible" title="确认删除" width="420px" :close-on-click-modal="!loading"
    :close-on-press-escape="!loading" @update:model-value="handleCancel">
    <p v-if="mode === 'single'" class="confirm-text">
      确定要删除豆板「<strong>{{ targetName }}</strong>」吗？删除后无法恢复。
    </p>
    <p v-else class="confirm-text">
      确定要删除已选的 <strong>{{ count }}</strong> 条豆板吗？删除后无法恢复。
    </p>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="danger" :loading="loading" @click="emit('confirm')">确认删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'single' },
  targetName: { type: String, default: '' },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const handleCancel = () => {
  if (props.loading) return
  emit('update:visible', false)
}
</script>

<style scoped>
.confirm-text {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.6;
}

.confirm-text strong {
  color: var(--el-text-color-primary);
}
</style>
