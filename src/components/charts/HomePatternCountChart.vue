<template>
  <BaseEchart ref="chartRef" :option="chartOption" class="chart-box" />
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseEchart from './BaseEchart.vue'
import {
  getHomeMonthlyPatternCountChartOption,
  getHomePatternCountChartOption,
} from './options/homeChartOptions'

const props = defineProps({
  /** month：会员/普通；all：按月双柱 */
  mode: {
    type: String,
    default: 'month',
  },
  memberCompletedCount: { type: Number, default: 0 },
  normalCompletedCount: { type: Number, default: 0 },
  memberPendingCount: { type: Number, default: 0 },
  normalPendingCount: { type: Number, default: 0 },
  monthlyCategories: { type: Array, default: () => [] },
  monthlyCompleted: { type: Array, default: () => [] },
  monthlyPending: { type: Array, default: () => [] },
})

const chartRef = ref(null)

const chartOption = computed(() => {
  if (props.mode === 'all') {
    return getHomeMonthlyPatternCountChartOption({
      categories: props.monthlyCategories,
      completed: props.monthlyCompleted,
      pending: props.monthlyPending,
    })
  }
  return getHomePatternCountChartOption({
    memberCompletedCount: props.memberCompletedCount,
    normalCompletedCount: props.normalCompletedCount,
    memberPendingCount: props.memberPendingCount,
    normalPendingCount: props.normalPendingCount,
  })
})

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>

<style scoped>
.chart-box {
  flex: 1;
  width: 100%;
  min-height: 220px;
}
</style>
