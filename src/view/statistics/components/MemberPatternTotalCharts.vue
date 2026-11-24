<template>
  <div class="pattern-chart-group pattern-chart-group--split">
    <div class="statistics-chart-left-column">
      <el-card shadow="never" class="statistics-chart-card statistics-chart-card-type">
        <h3>类型拼完占比</h3>
        <PatternTypeRatioChart ref="typeRatioChartRef" :patterns="patterns" @bar-click="openTypeCompleted" />
      </el-card>
      <el-card shadow="never" class="statistics-chart-card statistics-chart-card-pie">
        <h3>作者完成占比</h3>
        <PatternAuthorPieChart ref="pieChartRef" :patterns="patterns" />
      </el-card>
    </div>
    <el-card shadow="never" class="statistics-chart-card statistics-chart-card-main">
      <h3>会员图纸完成统计</h3>
      <PatternCompletionBarChart ref="mainChartRef" :patterns="patterns" show-author-completion-rate
        @bar-click="openAuthorCompleted" />
    </el-card>

    <AuthorCompletedPatternsDialog v-model:visible="completedDialogVisible" :title="completedDialogTitle"
      :patterns="completedPatterns" show-buyer :show-author="completedDialogShowAuthor" pattern-category="member" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { getAuthorCompletedPatterns, getTypeCompletedPatterns } from '@/composables/usePatternData'
import PatternAuthorPieChart from '@/components/charts/PatternAuthorPieChart.vue'
import PatternCompletionBarChart from '@/components/charts/PatternCompletionBarChart.vue'
import PatternTypeRatioChart from '@/components/charts/PatternTypeRatioChart.vue'
import AuthorCompletedPatternsDialog from './AuthorCompletedPatternsDialog.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
})

const mainChartRef = ref(null)
const pieChartRef = ref(null)
const typeRatioChartRef = ref(null)
const dialogConfig = ref(null)

const completedDialogVisible = computed({
  get: () => Boolean(dialogConfig.value),
  set: (visible) => {
    if (!visible) dialogConfig.value = null
  },
})

const completedDialogTitle = computed(() =>
  dialogConfig.value ? `${dialogConfig.value.label} · 已拼完列表` : '',
)

const completedPatterns = computed(() => {
  if (!dialogConfig.value) return []

  const { kind, key } = dialogConfig.value
  if (kind === 'author') return getAuthorCompletedPatterns(props.patterns, key)
  return getTypeCompletedPatterns(props.patterns, key)
})

const completedDialogShowAuthor = computed(() => dialogConfig.value?.kind === 'type')

const openAuthorCompleted = (author) => {
  dialogConfig.value = { kind: 'author', key: author, label: author }
}

const openTypeCompleted = ({ key, name }) => {
  dialogConfig.value = { kind: 'type', key, label: name }
}

const chartRefs = [mainChartRef, pieChartRef, typeRatioChartRef]

const resizeCharts = () => {
  chartRefs.forEach((chartRef) => chartRef.value?.resize())
}

const disposeCharts = () => {
  chartRefs.forEach((chartRef) => chartRef.value?.dispose())
}

const scheduleRender = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chartRefs.forEach((chartRef) => chartRef.value?.render())
        resizeCharts()
      })
    })
  })
}

defineExpose({
  render: scheduleRender,
  resize: resizeCharts,
  dispose: disposeCharts,
})

onMounted(scheduleRender)
onBeforeUnmount(disposeCharts)
</script>

<style scoped src="../statistics-charts.css"></style>
