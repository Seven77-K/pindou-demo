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
import { getCostDailyTrendChartOption } from '@/view/statistics/utils/statisticsChartOptions'
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

const emit = defineEmits(['day-click'])

const chartRef = ref(null)

const chartOption = computed(() =>
  getCostDailyTrendChartOption(props.amounts, props.categories, props.emptyText),
)

function handleDayClick(params) {
  if (params.componentType !== 'series' || params.seriesType !== 'line') return
  if (!(Number(params.value) > 0)) return
  window.requestAnimationFrame(() => {
    emit('day-click', params.dataIndex)
  })
}

const chartEvents = { click: handleDayClick }

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
