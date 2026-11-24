<template>
  <div class="cost-chart-wrap">
    <BaseEchart ref="chartRef" :option="chartOption" class="chart-box" />
    <div v-if="data.length" class="cost-chart-center">
      <span class="cost-center-title">总花费</span>
      <span class="cost-center-value">{{ formatCostAmount(totalAmount) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatCostAmount } from '@/composables/useCostData'
import BaseEchart from './BaseEchart.vue'
import { getHomeCostPieChartOption } from './options/homeChartOptions'

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
})

const chartRef = ref(null)

const chartOption = computed(() => getHomeCostPieChartOption(props.data))

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>

<style scoped>
.cost-chart-wrap {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 220px;
}

.chart-box {
  flex: 1;
  min-height: 220px;
}

.cost-chart-center {
  position: absolute;
  left: 34%;
  top: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.cost-center-title {
  color: #9a8a92;
  font-size: 18px;
  line-height: 1.2;
}

.cost-center-value {
  color: #52404a;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}
</style>
