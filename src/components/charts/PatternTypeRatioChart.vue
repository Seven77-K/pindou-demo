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
import { buildTypeCompletionRateData } from '@/composables/usePatternData'
import { getTypeRatioChartOption } from '@/view/statistics/utils/statisticsChartOptions'
import BaseEchart from './BaseEchart.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
  includeMemberType: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['bar-click'])

const chartRef = ref(null)

const chartOption = computed(() =>
  getTypeRatioChartOption(props.patterns, { includeMemberType: props.includeMemberType }),
)

function handleBarClick(params) {
  if (params.componentType !== 'series' || params.seriesType !== 'bar') return

  const data = buildTypeCompletionRateData(props.patterns, {
    includeMemberType: props.includeMemberType,
  })
  const item = data[params.dataIndex]
  if (!item || item.total <= 0) return

  window.requestAnimationFrame(() => {
    emit('bar-click', item)
  })
}

const chartEvents = { click: handleBarClick }

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
