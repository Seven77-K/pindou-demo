<template>
  <BaseEchart ref="chartRef" :option="chartOption" class="statistics-chart-container" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { getPieChartOption } from '@/view/statistics/utils/statisticsChartOptions'
import BaseEchart from './BaseEchart.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
})

const chartRef = ref(null)

const chartOption = computed(() => getPieChartOption(props.patterns))

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
