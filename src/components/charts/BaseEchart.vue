<template>
  <div ref="chartRef" class="base-echart"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { createSafeResizeObserver } from '@/utils/safeResizeObserver'
import { useEchartsInstance } from './useEchartsInstance'

const props = defineProps({
  option: {
    type: Object,
    default: null,
  },
  chartEvents: {
    type: Object,
    default: null,
  },
})

const { chartRef, render, resize, dispose } = useEchartsInstance()

let resizeObserver = null

const apply = () => {
  if (props.option) render(props.option, props.chartEvents)
}

watch(() => props.option, apply, { deep: true })

onMounted(() => {
  apply()
  if (chartRef.value) {
    resizeObserver = createSafeResizeObserver(() => resize())
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  dispose()
})

defineExpose({ render: apply, resize, dispose })
</script>

<style scoped>
.base-echart {
  width: 100%;
  height: 100%;
}
</style>
