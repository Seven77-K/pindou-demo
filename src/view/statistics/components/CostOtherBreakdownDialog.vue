<template>
  <Teleport v-if="visible" to="body">
    <div class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ title }}</h4>
            <p class="header-sub">材料、工具、耗材等归入「其他」的花费细分</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div v-if="hasData" class="stats-row">
            <span v-for="(name, index) in categories" :key="name" class="stat-pill">
              {{ name }} {{ formatCostAmount(amounts[index]) }}
            </span>
          </div>

          <div class="chart-panel">
            <CostCategoryBarChart
              v-if="hasData"
              :key="chartKey"
              ref="chartRef"
              :amounts="amounts"
              :line-amounts="lineAmounts"
              :categories="categories"
              :enable-drill-down="false"
              empty-text="暂无其他类花费数据"
            />
            <p v-else class="empty-text">暂无其他类花费数据</p>
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
import CostCategoryBarChart from '@/components/charts/CostCategoryBarChart.vue'
import { formatCostAmount } from '@/composables/useCostData'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '其他 · 类别细分' },
  chartKey: { type: String, default: 'total' },
  categories: { type: Array, default: () => [] },
  amounts: { type: Array, default: () => [] },
  lineAmounts: { type: Array, default: null },
})

const emit = defineEmits(['update:visible'])

const chartRef = ref(null)

const hasData = computed(() => {
  if (props.lineAmounts) {
    return props.amounts.some((value) => value > 0) || props.lineAmounts.some((value) => value > 0)
  }
  return props.amounts.some((value) => value > 0)
})

const handleClose = () => {
  emit('update:visible', false)
}

const renderChart = async () => {
  await nextTick()
  chartRef.value?.render()
  requestAnimationFrame(() => chartRef.value?.resize())
}

const handleResize = () => {
  if (props.visible) chartRef.value?.resize()
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) renderChart()
  },
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (props.visible) renderChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
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
  background: rgba(36, 24, 32, 0.42);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(760px, 100%);
  max-height: min(88vh, 720px);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(82, 64, 74, 0.18);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
}

.header-text h4 {
  margin: 0;
  color: #3d2f38;
  font-size: 18px;
  font-weight: 600;
}

.header-sub {
  margin: 6px 0 0;
  color: #9a8a92;
  font-size: 12px;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #9a8a92;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 0 24px 16px;
  overflow: auto;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f8f0f4;
  color: #6e5660;
  font-size: 12px;
}

.chart-panel {
  height: 320px;
}

.empty-text {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  color: #9a8a92;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 20px;
}

.btn-cancel {
  min-width: 88px;
  padding: 8px 16px;
  border: 1px solid #eadde4;
  border-radius: 8px;
  background: #fff;
  color: #6e5660;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #faf5f7;
}
</style>
