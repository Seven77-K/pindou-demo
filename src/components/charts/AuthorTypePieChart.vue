<template>
  <BaseEchart ref="chartRef" :option="chartOption" class="chart-container" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { buildAuthorTypePieData, usePatternData } from '@/composables/usePatternData'
import BaseEchart from './BaseEchart.vue'

const props = defineProps({
  author: {
    type: String,
    default: '',
  },
})

const { memberPatterns } = usePatternData()

const chartRef = ref(null)

const typePieColors = {
  免费图纸: '#5ec9b8',
  会员图纸: '#c49bff',
  付费图纸: '#ff8fa3',
}

const pieData = computed(() => {
  if (!props.author) return []
  return buildAuthorTypePieData(props.author, memberPatterns.value)
})

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} 张 ({d}%)',
  },
  legend: {
    orient: 'horizontal',
    bottom: 0,
    left: 'center',
    itemGap: 20,
    itemWidth: 12,
    itemHeight: 12,
    textStyle: { color: '#52404a', fontSize: 13 },
  },
  series: [
    {
      name: '图纸类型',
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['50%', '46%'],
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 3,
      },
      label: {
        show: true,
        formatter: '{d}%',
        color: '#52404a',
        fontSize: 13,
        fontWeight: 600,
      },
      labelLine: {
        length: 12,
        length2: 8,
        smooth: true,
      },
      emphasis: {
        scale: true,
        scaleSize: 6,
      },
      data: pieData.value.map((item) => ({
        ...item,
        itemStyle: { color: typePieColors[item.name] || '#deb8f0' },
      })),
    },
  ],
}))

defineExpose({
  render: () => chartRef.value?.render(),
  resize: () => chartRef.value?.resize(),
  dispose: () => chartRef.value?.dispose(),
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 340px;
}
</style>
