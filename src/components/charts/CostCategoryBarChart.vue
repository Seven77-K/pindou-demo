<template>
  <BaseEchart
    ref="chartRef"
    :option="chartOption"
    :chart-events="chartEvents"
    class="statistics-chart-container"
  />
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { COST_OTHER_GROUP } from '@/composables/useCostData'
import {
  getCostBarChartOption,
  getCostMonthCompareChartOption,
} from '@/view/statistics/utils/statisticsChartOptions'
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
  lineAmounts: {
    type: Array,
    default: null,
  },
  emptyText: {
    type: String,
    default: '暂无数据',
  },
  /** 仅该类别可点（默认「其他」）；与 clickableAll 互斥优先 all */
  clickableCategory: {
    type: String,
    default: COST_OTHER_GROUP,
  },
  /** 金额 > 0 的柱均可点击查看详情 */
  clickableAll: {
    type: Boolean,
    default: false,
  },
  enableDrillDown: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['bar-click'])

const chartRef = ref(null)

const chartOption = computed(() => {
  const options = props.enableDrillDown
    ? {
        clickableAll: props.clickableAll,
        clickableCategory: props.clickableAll ? '' : props.clickableCategory,
      }
    : {}
  if (props.lineAmounts) {
    return getCostMonthCompareChartOption(
      props.amounts,
      props.lineAmounts,
      props.categories,
      props.emptyText,
      options,
    )
  }
  return getCostBarChartOption(props.amounts, props.categories, props.emptyText, options)
})

function handleBarClick(params) {
  if (!props.enableDrillDown) return
  if (params.componentType !== 'series' || params.seriesType !== 'bar') return
  const category = props.categories[params.dataIndex]
  if (!category || !(Number(params.value) > 0)) return
  if (!props.clickableAll && category !== props.clickableCategory) return
  nextTick(() => {
    emit('bar-click', category)
  })
}

const chartEvents = props.enableDrillDown ? { click: handleBarClick } : null

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>
