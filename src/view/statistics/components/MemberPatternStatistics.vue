<template>
  <el-carousel v-model="activeIndex" class="member-carousel" height="100%" :autoplay="false" :loop="false"
    arrow="always" indicator-position="outside" @change="handleSlideChange">
    <el-carousel-item v-for="(slide, index) in slides" :key="slide.key">
      <div class="member-slide">
        <p class="statistics-summary">{{ getSlideSummary(slide) }}</p>
        <MemberPatternTotalCharts v-if="slide.type === 'total'" :ref="(el) => setChartRef(index, el)"
          :patterns="patterns" />
        <PatternChartGroup v-else :ref="(el) => setChartRef(index, el)" :patterns="getPatternsByBuyer(slide.key)"
          main-title="会员图纸完成统计" />
      </div>
    </el-carousel-item>
  </el-carousel>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { getDefaultMemberBuyer, MEMBER_BUYERS } from '@/config/permissions'
import { isPatternCompleted } from '@/composables/usePatternData'
import MemberPatternTotalCharts from './MemberPatternTotalCharts.vue'
import PatternChartGroup from './PatternChartGroup.vue'

const props = defineProps({
  patterns: {
    type: Array,
    default: () => [],
  },
})

const TOTAL_SLIDE_KEY = '总计'

const { user } = useAuth()
const activeIndex = ref(0)
const chartRefs = ref({})

const slides = computed(() => {
  const defaultBuyer = getDefaultMemberBuyer(user.value)
  const otherBuyer = MEMBER_BUYERS.map((item) => item.name).find((name) => name !== defaultBuyer)
  const buyerSlides = otherBuyer ? [defaultBuyer, otherBuyer] : [defaultBuyer]
  return [
    ...buyerSlides.map((key) => ({ key, type: 'buyer' })),
    { key: TOTAL_SLIDE_KEY, type: 'total' },
  ]
})

const getPatternsByBuyer = (buyer) => props.patterns.filter((item) => item.buyer === buyer)

const getPatternCount = (buyer) => getPatternsByBuyer(buyer).length

const getCompletedCount = (buyer) =>
  getPatternsByBuyer(buyer).filter(isPatternCompleted).length

const getSlideSummary = (slide) => {
  if (slide.type === 'total') {
    const completed = props.patterns.filter(isPatternCompleted).length
    return `总计：共 ${props.patterns.length} 条图纸，已完成 ${completed} 条（图表仅统计已完成）`
  }
  return `${slide.key}：共 ${getPatternCount(slide.key)} 条图纸，已完成 ${getCompletedCount(slide.key)} 条（图表仅统计已完成）`
}

const setChartRef = (index, el) => {
  if (el) {
    chartRefs.value[index] = el
    return
  }
  delete chartRefs.value[index]
}

const renderSlideChart = (index) => {
  chartRefs.value[index]?.render?.()
}

const renderActiveChart = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      renderSlideChart(activeIndex.value)
    })
  })
}

const handleSlideChange = (index) => {
  activeIndex.value = index
  nextTick(() => {
    requestAnimationFrame(() => {
      renderSlideChart(index)
      window.setTimeout(() => renderSlideChart(index), 400)
    })
  })
}

const resize = () => {
  renderSlideChart(activeIndex.value)
}

const dispose = () => {
  Object.values(chartRefs.value).forEach((chart) => chart?.dispose?.())
  chartRefs.value = {}
}

watch(
  () => getDefaultMemberBuyer(user.value),
  () => {
    activeIndex.value = 0
    renderActiveChart()
  },
)

watch(
  () => props.patterns,
  () => {
    renderActiveChart()
  },
  { deep: true },
)

defineExpose({ render: renderActiveChart, resize, dispose })

onMounted(renderActiveChart)
</script>

<style scoped src="../statistics-charts.css"></style>
