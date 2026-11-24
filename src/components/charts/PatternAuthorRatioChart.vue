<template>
  <BaseEchart
    ref="chartRef"
    :option="chartOption"
    :chart-events="chartEvents"
    class="statistics-chart-container"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { getAuthorRatioChartOption } from '@/view/statistics/utils/statisticsChartOptions'
import BaseEchart from './BaseEchart.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['bar-click'])

const chartRef = ref(null)

const chartOption = computed(() => getAuthorRatioChartOption(props.patterns))

function handleBarClick(params) {
  if (params.componentType !== 'series' || params.seriesType !== 'bar') return
  const author = params.name
  if (!author) return
  window.requestAnimationFrame(() => {
    emit('bar-click', author)
  })
}

const chartEvents = { click: handleBarClick }

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
