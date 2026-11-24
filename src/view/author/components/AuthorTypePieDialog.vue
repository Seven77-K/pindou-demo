<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ author }} · 图纸类型占比</h4>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div v-if="hasData" class="stats-row">
            <span v-for="item in pieData" :key="item.name" class="stat-pill" :class="typeClass(item.name)">
              {{ item.name }} {{ item.value }} 张
            </span>
          </div>

          <div class="chart-panel">
            <AuthorTypePieChart v-if="hasData" ref="chartRef" :author="author" />
            <p v-else class="empty-text">该作者暂无图纸数据</p>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AuthorTypePieChart from '@/components/charts/AuthorTypePieChart.vue'
import { buildAuthorTypePieData, usePatternData } from '@/composables/usePatternData'

const props = defineProps({
  visible: { type: Boolean, default: false },
  author: { type: String, default: '' },
})

const emit = defineEmits(['update:visible'])

const { memberPatterns } = usePatternData()

const chartRef = ref(null)

const pieData = computed(() => {
  if (!props.author) return []
  return buildAuthorTypePieData(props.author, memberPatterns.value)
})

const hasData = computed(() => pieData.value.length > 0)

const typeClass = (name) => {
  if (name === '免费图纸') return 'type-free'
  if (name === '付费图纸') return 'type-paid'
  return 'type-member'
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleResize = () => {
  if (props.visible) chartRef.value?.resize()
}

watch(
  () => [props.visible, props.author],
  async ([visible]) => {
    if (visible) {
      await nextTick()
      chartRef.value?.render()
      requestAnimationFrame(() => chartRef.value?.resize())
    } else {
      chartRef.value?.dispose()
    }
  },
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartRef.value?.dispose()
})
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
  background: rgba(0, 0, 0, 0.65);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: 540px;
  max-width: 92vw;
  max-height: 90vh;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.header-text h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.author-name {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow: auto;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.5;
}

.type-free {
  background: #e8faf7;
  color: #2db5a8;
}

.type-paid {
  background: #fff0f2;
  color: #e85d6a;
}

.type-member {
  background: #f3ebff;
  color: #9333ea;
}

.chart-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  padding: 12px 8px 4px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
}

.empty-text {
  margin: 0;
  padding: 48px 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 14px 20px 16px;
  border-top: 1px solid var(--color-border);
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
