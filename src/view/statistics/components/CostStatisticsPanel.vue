<template>
  <div class="statistics-panel">
    <p class="statistics-summary">
      共 {{ linkedExpenses.length }} 条花费记录，本月 {{ formatCostAmount(monthTotal) }}，本年
      {{ formatCostAmount(yearTotal) }}，总计 {{ formatCostAmount(allTotal) }}
    </p>
    <div class="cost-charts">
      <div class="cost-charts-left">
        <el-card shadow="never" class="statistics-chart-card">
          <div class="statistics-chart-card-header">
            <h3>{{ periodScope === 'month' ? '本月数据' : '本年数据' }}</h3>
            <div class="period-toggle" role="group" aria-label="花费周期切换">
              <button type="button" class="period-toggle-btn" :class="{ active: periodScope === 'month' }"
                @click="setPeriodScope('month')">
                月
              </button>
              <button type="button" class="period-toggle-btn" :class="{ active: periodScope === 'year' }"
                @click="setPeriodScope('year')">
                年
              </button>
            </div>
          </div>
          <CostCategoryBarChart ref="periodChartRef" :amounts="periodChartAmounts"
            :line-amounts="periodChartLineAmounts" :categories="costChartData.categories" :empty-text="periodEmptyText"
            clickable-all @bar-click="(category) => openCategoryBar(category, 'period')" />
        </el-card>
        <el-card shadow="never" class="statistics-chart-card">
          <div class="statistics-chart-card-header">
            <h3>{{ trendScope === 'day' ? '本月每日花费' : '本年每月花费' }}</h3>
            <div class="period-toggle" role="group" aria-label="花费趋势切换">
              <button type="button" class="period-toggle-btn" :class="{ active: trendScope === 'month' }"
                @click="setTrendScope('month')">
                月
              </button>
              <button type="button" class="period-toggle-btn" :class="{ active: trendScope === 'day' }"
                @click="setTrendScope('day')">
                日
              </button>
            </div>
          </div>
          <CostDailyLineChart v-if="trendScope === 'day'" ref="dailyChartRef"
            :amounts="monthDailyChartData.amounts" :categories="monthDailyChartData.categories"
            empty-text="本月暂无花费数据" @day-click="openDayDetail" />
          <CostMonthlyBarChart v-else ref="monthlyChartRef" :amounts="yearMonthlyChartData.amounts"
            :categories="yearMonthlyChartData.categories" empty-text="本年暂无花费数据"
            @bar-click="openMonthDetail" />
        </el-card>
      </div>
      <el-card shadow="never" class="statistics-chart-card cost-charts-right">
        <h3>总数据</h3>
        <CostCategoryBarChart ref="totalChartRef" :amounts="costChartData.totalAmounts"
          :categories="costChartData.categories" empty-text="暂无花费数据" clickable-all
          @bar-click="(category) => openCategoryBar(category, 'total')" />
      </el-card>
    </div>

    <CostMonthDetailDialog v-model:visible="monthDetailVisible" :title="monthDetailTitle"
      :chart-key="monthDetailChartKey" :categories="monthDetailData?.categories || []"
      :amounts="monthDetailData?.amounts || []" :total="monthDetailData?.total || 0"
      @other-click="openMonthOtherBreakdown" />

    <CostDayDetailDialog
      v-model:visible="listDetailVisible"
      :title="listDetailTitle"
      :rows="listDetailRows"
      :total="listDetailTotal"
      :show-date="listDetailShowDate"
      :empty-text="listDetailEmptyText"
    />

    <CostOtherBreakdownDialog v-model:visible="otherDialogVisible" :title="otherDialogTitle"
      :chart-key="otherDialogScope" :categories="otherDialogData.categories" :amounts="otherDialogData.amounts"
      :line-amounts="otherDialogData.lineAmounts" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CostCategoryBarChart from '@/components/charts/CostCategoryBarChart.vue'
import CostDailyLineChart from '@/components/charts/CostDailyLineChart.vue'
import CostMonthlyBarChart from '@/components/charts/CostMonthlyBarChart.vue'
import CostDayDetailDialog from './CostDayDetailDialog.vue'
import CostMonthDetailDialog from './CostMonthDetailDialog.vue'
import CostOtherBreakdownDialog from './CostOtherBreakdownDialog.vue'
import {
  buildCostCategoryChartData,
  buildCostCategoryExpenseRows,
  buildCostDayExpenseRows,
  buildCostMonthCategoryChartData,
  buildCostMonthDailyChartData,
  buildCostYearMonthlyChartData,
  COST_OTHER_GROUP,
  displayCostChartCategory,
  formatCostAmount,
  useCostData,
} from '@/composables/useCostData'

const { linkedExpenses, monthTotal, yearTotal, allTotal } = useCostData()

const costChartData = computed(() => buildCostCategoryChartData(linkedExpenses.value))
const yearMonthlyChartData = computed(() => buildCostYearMonthlyChartData(linkedExpenses.value))
const monthDailyChartData = computed(() => buildCostMonthDailyChartData(linkedExpenses.value))

const periodScope = ref('month')
const trendScope = ref('day')
const periodChartRef = ref(null)
const dailyChartRef = ref(null)
const monthlyChartRef = ref(null)
const totalChartRef = ref(null)

const chartRefs = [periodChartRef, dailyChartRef, monthlyChartRef, totalChartRef]

const periodChartAmounts = computed(() =>
  periodScope.value === 'month'
    ? costChartData.value.monthAmounts
    : costChartData.value.yearAmounts,
)

const periodChartLineAmounts = computed(() =>
  periodScope.value === 'month' ? costChartData.value.lastMonthAmounts : null,
)

const periodEmptyText = computed(() =>
  periodScope.value === 'month' ? '本月及上月暂无花费数据' : '本年暂无花费数据',
)

const otherDialogVisible = ref(false)
const otherDialogScope = ref('total')
const selectedMonthIndex = ref(-1)
const selectedDayIndex = ref(-1)
const selectedCategory = ref('')
const selectedCategoryScope = ref('all')

const monthDetailVisible = computed({
  get: () => selectedMonthIndex.value >= 0,
  set: (visible) => {
    if (!visible) selectedMonthIndex.value = -1
  },
})

const listDetailMode = computed(() => {
  if (selectedCategory.value) return 'category'
  if (selectedDayIndex.value >= 0) return 'day'
  return ''
})

const listDetailVisible = computed({
  get: () => Boolean(listDetailMode.value),
  set: (visible) => {
    if (visible) return
    selectedDayIndex.value = -1
    selectedCategory.value = ''
    selectedCategoryScope.value = 'all'
  },
})

const monthDetailData = computed(() => {
  if (selectedMonthIndex.value < 0) return null
  return buildCostMonthCategoryChartData(linkedExpenses.value, selectedMonthIndex.value)
})

const dayDetailData = computed(() => {
  if (selectedDayIndex.value < 0) return null
  return buildCostDayExpenseRows(linkedExpenses.value, selectedDayIndex.value)
})

const categoryDetailData = computed(() => {
  if (!selectedCategory.value) return null
  return buildCostCategoryExpenseRows(
    linkedExpenses.value,
    selectedCategory.value,
    selectedCategoryScope.value,
  )
})

const monthDetailTitle = computed(() => {
  if (!monthDetailData.value) return '月份花费明细'
  return `${monthDetailData.value.year}年${monthDetailData.value.monthLabel} · 花费明细`
})

const categoryScopeLabel = computed(() => {
  if (selectedCategoryScope.value === 'month') return '本月'
  if (selectedCategoryScope.value === 'year') return '本年'
  return '总计'
})

const listDetailTitle = computed(() => {
  if (listDetailMode.value === 'category' && selectedCategory.value) {
    return `${categoryScopeLabel.value} · ${displayCostChartCategory(selectedCategory.value)} · 花费明细`
  }
  if (listDetailMode.value === 'day' && dayDetailData.value) {
    const { year, month, day } = dayDetailData.value
    return `${year}年${month}月${day}日 · 花费明细`
  }
  return '花费明细'
})

const listDetailRows = computed(() => {
  if (listDetailMode.value === 'category') return categoryDetailData.value?.rows || []
  if (listDetailMode.value === 'day') return dayDetailData.value?.rows || []
  return []
})

const listDetailTotal = computed(() => {
  if (listDetailMode.value === 'category') return categoryDetailData.value?.total || 0
  if (listDetailMode.value === 'day') return dayDetailData.value?.total || 0
  return 0
})

const listDetailShowDate = computed(() => listDetailMode.value === 'category')

const listDetailEmptyText = computed(() =>
  listDetailMode.value === 'category' ? '该类别暂无花费记录' : '该日暂无花费记录',
)

const monthDetailChartKey = computed(() =>
  selectedMonthIndex.value >= 0 ? `month-${selectedMonthIndex.value}` : 'month-detail',
)

const otherDialogTitle = computed(() => {
  if (otherDialogScope.value === 'monthDetail' && monthDetailData.value) {
    return `其他 · ${monthDetailData.value.year}年${monthDetailData.value.monthLabel}细分`
  }
  if (otherDialogScope.value === 'month') return '其他 · 本月细分'
  if (otherDialogScope.value === 'year') return '其他 · 本年细分'
  return '其他 · 总计细分'
})

const otherDialogData = computed(() => {
  if (otherDialogScope.value === 'monthDetail' && monthDetailData.value) {
    const breakdown = monthDetailData.value.otherBreakdown
    return {
      categories: breakdown.categories,
      amounts: breakdown.totalAmounts,
      lineAmounts: null,
    }
  }
  const breakdown = costChartData.value.otherBreakdown
  if (otherDialogScope.value === 'month') {
    return {
      categories: breakdown.categories,
      amounts: breakdown.monthAmounts,
      lineAmounts: breakdown.lastMonthAmounts,
    }
  }
  if (otherDialogScope.value === 'year') {
    return {
      categories: breakdown.categories,
      amounts: breakdown.yearAmounts,
      lineAmounts: null,
    }
  }
  return {
    categories: breakdown.categories,
    amounts: breakdown.totalAmounts,
    lineAmounts: null,
  }
})

const setPeriodScope = (scope) => {
  if (periodScope.value === scope) return
  periodScope.value = scope
  nextTick(() => {
    periodChartRef.value?.resize()
  })
}

const setTrendScope = (scope) => {
  if (trendScope.value === scope) return
  trendScope.value = scope
  nextTick(() => {
    if (scope === 'day') dailyChartRef.value?.resize()
    else monthlyChartRef.value?.resize()
  })
}

const openOtherBreakdown = (scope) => {
  otherDialogScope.value = scope === 'total' ? 'total' : periodScope.value
  nextTick(() => {
    otherDialogVisible.value = true
  })
}

const openCategoryDetail = (category, scope) => {
  selectedDayIndex.value = -1
  selectedCategory.value = category
  selectedCategoryScope.value = scope
}

const openCategoryBar = (category, chartSource) => {
  if (category === COST_OTHER_GROUP) {
    openOtherBreakdown(chartSource === 'total' ? 'total' : 'period')
    return
  }
  const scope =
    chartSource === 'total'
      ? 'all'
      : periodScope.value === 'year'
        ? 'year'
        : 'month'
  // 等 ECharts 点击事件收尾后再开弹窗，避免 Vue patch 报错
  nextTick(() => openCategoryDetail(category, scope))
}

const openMonthDetail = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const openDayDetail = (dayIndex) => {
  selectedCategory.value = ''
  selectedCategoryScope.value = 'all'
  nextTick(() => {
    selectedDayIndex.value = dayIndex
  })
}

const openMonthOtherBreakdown = () => {
  otherDialogScope.value = 'monthDetail'
  nextTick(() => {
    otherDialogVisible.value = true
  })
}

const resize = () => {
  chartRefs.forEach((chartRef) => chartRef.value?.resize())
}

const dispose = () => {
  chartRefs.forEach((chartRef) => chartRef.value?.dispose())
}

watch(periodScope, () => {
  nextTick(() => {
    periodChartRef.value?.resize()
  })
})

watch(trendScope, () => {
  nextTick(() => {
    if (trendScope.value === 'day') dailyChartRef.value?.resize()
    else monthlyChartRef.value?.resize()
  })
})

defineExpose({ render: resize, resize, dispose })

onMounted(resize)

onBeforeUnmount(dispose)
</script>

<style scoped src="../statistics-charts.css"></style>
