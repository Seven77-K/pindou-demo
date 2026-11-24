<template>
  <BaseEchart ref="chartRef" :option="chartOption" class="chart-box" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { buildOtherChartData, toolInventory } from '@/view/tools/constants'
import { getToolCountBarChartOption } from '@/view/tools/utils/toolChartOptions'
import BaseEchart from './BaseEchart.vue'

const chartRef = ref(null)

const chartOption = computed(() => {
  void toolInventory
  return getToolCountBarChartOption(
    buildOtherChartData(),
    '暂无其他工具数据',
    'other',
  )
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
  min-height: 200px;
}
</style>
