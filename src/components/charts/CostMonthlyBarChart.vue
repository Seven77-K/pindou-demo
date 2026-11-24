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
import { getCostMonthlyTrendChartOption } from '@/view/statistics/utils/statisticsChartOptions'
import BaseEchart from './BaseEchart.vue'

const props = defineProps({
  amounts: {
    type: Array,
    default: () => [],
  },
  categories: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: '暂无数据',
  },
})

const emit = defineEmits(['bar-click'])

const chartRef = ref(null)

const chartOption = computed(() =>
  getCostMonthlyTrendChartOption(props.amounts, props.categories, props.emptyText),
)

function handleBarClick(params) {
  if (params.componentType !== 'series' || params.seriesType !== 'bar') return
  if (!(Number(params.value) > 0)) return
  window.requestAnimationFrame(() => {
    emit('bar-click', params.dataIndex)
  })
}

const chartEvents = { click: handleBarClick }

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
