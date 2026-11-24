<template>
  <div class="statistics-panel">
    <p class="statistics-summary">
      共 {{ patterns.length }} 条图纸，已完成 {{ completedCount }} 条（图表仅统计已完成）
    </p>
    <PatternChartGroup
      ref="chartGroupRef"
      :patterns="patterns"
      main-title="普通图纸完成统计"
      :include-member-type="false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { isPatternCompleted } from '@/composables/usePatternData'
import PatternChartGroup from './PatternChartGroup.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
  active: {
    type: Boolean,
    default: true,
  },
})

const chartGroupRef = ref(null)

const completedCount = computed(
  () => props.patterns.filter(isPatternCompleted).length,
)

const render = () => chartGroupRef.value?.render()
const resize = () => chartGroupRef.value?.resize()
const dispose = () => chartGroupRef.value?.dispose()

watch(
  () => props.patterns,
  () => {
    if (props.active) render()
  },
  { deep: true },
)

watch(
  () => props.active,
  (value) => {
    if (value) render()
  },
)

defineExpose({ render, resize, dispose })

onMounted(() => {
  if (props.active) render()
})
</script>

<style scoped src="../statistics-charts.css"></style>
