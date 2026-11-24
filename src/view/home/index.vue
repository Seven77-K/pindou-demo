<template>
  <div class="page">
    <el-row :gutter="16" class="stat-cards">
      <el-col v-for="item in stats" :key="item.key" :xs="12" :sm="12" :md="6">
        <el-card
          shadow="never"
          class="stat-card"
          :class="[`stat-card-${item.key}`, { 'stat-card-clickable': item.key === 'cost' }]"
          @click="item.key === 'cost' && toggleCostView()"
        >
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">
            {{ item.label }}
            <span v-if="item.key === 'cost'" class="stat-tip">点击切换</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div class="overview-title">
          <h3>数据总览</h3>
          <p class="overview-summary">
            完成率 {{ completionRate }}% · 工具 {{ toolCount }} 件
          </p>
        </div>
        <div class="overview-meta">
          <span class="meta-item">
            <span class="meta-label">总花费</span>
            <span class="meta-value">{{ formatCostAmount(allTotal) }}</span>
          </span>
          <span class="meta-divider"></span>
          <span class="meta-item">
            <span class="meta-label">本月</span>
            <span class="meta-value">{{ formatCostAmount(monthTotal) }}</span>
          </span>
        </div>
      </div>

      <div class="overview-charts">
        <div class="chart-panel">
          <div class="chart-panel-header">
            <h4 class="chart-title">图纸完成概况</h4>
            <div class="chart-scope-bar">
              <span v-show="chartScope === 'month'" class="chart-picker-slot">
                <el-date-picker
                  v-model="chartMonth"
                  type="month"
                  value-format="YYYY-MM"
                  format="YYYY年M月"
                  :clearable="false"
                  :editable="false"
                  size="small"
                  placeholder="选择月份"
                  class="chart-month-picker"
                  teleported
                />
              </span>
              <span v-show="chartScope === 'all'" class="chart-picker-slot">
                <el-date-picker
                  v-model="chartYear"
                  type="year"
                  value-format="YYYY"
                  format="YYYY年"
                  :clearable="false"
                  :editable="false"
                  :disabled-date="disabledChartYear"
                  size="small"
                  placeholder="选择年份"
                  class="chart-year-picker"
                  teleported
                />
              </span>
              <div class="chart-scope-toggle" role="group" aria-label="完成概况范围">
                <button
                  type="button"
                  class="chart-scope-btn"
                  :class="{ active: chartScope === 'month' }"
                  @click="chartScope = 'month'"
                >
                  本月
                </button>
                <button
                  type="button"
                  class="chart-scope-btn"
                  :class="{ active: chartScope === 'all' }"
                  @click="chartScope = 'all'"
                >
                  所有
                </button>
              </div>
            </div>
          </div>
          <HomePatternCountChart
            :mode="chartScope"
            :member-completed-count="memberCompletedCount"
            :normal-completed-count="normalCompletedCount"
            :member-pending-count="memberPendingCount"
            :normal-pending-count="normalPendingCount"
            :monthly-categories="monthlyChartData.categories"
            :monthly-completed="monthlyChartData.completed"
            :monthly-pending="monthlyChartData.pending"
          />
        </div>
        <div class="chart-panel calendar-panel">
          <HomeCompletionCalendar
            v-model:summary-mode="calendarMode"
            :patterns-by-date="activeCalendarData"
            @select-date="openDayPatterns"
          />
        </div>
      </div>
    </el-card>

    <AuthorCompletedPatternsDialog
      v-model:visible="dayDialogVisible"
      :title="dayDialogTitle"
      :patterns="dayDialogPatterns"
      :list-hint="calendarMode === 'pattern' ? '新增图纸' : '完成图纸'"
      :show-author="true"
      :show-buyer="true"
      pattern-category=""
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HomePatternCountChart from '@/components/charts/HomePatternCountChart.vue'
import { useAuth } from '@/composables/useAuth'
import { formatCostAmount, useCostData } from '@/composables/useCostData'
import {
  isPatternCompleted,
  listPatternAssembleDates,
  loadPatternImages,
  loadPatterns,
  usePatternData,
} from '@/composables/usePatternData'
import AuthorCompletedPatternsDialog from '@/view/statistics/components/AuthorCompletedPatternsDialog.vue'
import HomeCompletionCalendar from '@/view/home/components/HomeCompletionCalendar.vue'
import {
  boardInventory,
  getTotalToolStock,
  initBoardInventory,
  initToolInventory,
  toolInventory,
} from '@/view/tools/constants'

const { user } = useAuth()
const { memberPatterns, normalPatterns } = usePatternData()
const { monthTotal, allTotal } = useCostData()
const costShowTotal = ref(false)
const calendarMode = ref('completed')
const dayDialogVisible = ref(false)
const selectedDay = ref('')

const pad2 = (n) => String(n).padStart(2, '0')
const now = new Date()
/** 图纸完成概况：本月 | 所有 */
const chartScope = ref('month')
const chartMonth = ref(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`)
const chartYear = ref(String(now.getFullYear()))

/** 「所有」年份选择：有完成/未完成数据的年份 */
const chartYearsWithData = computed(() => {
  const years = new Set()
  const addYear = (raw) => {
    const key = normalizeDateKey(raw)
    if (key) years.add(key.slice(0, 4))
  }

  ;[...memberPatterns.value, ...normalPatterns.value].forEach((item) => {
    if (isPatternCompleted(item)) {
      listPatternAssembleDates(item).forEach(addYear)
    } else {
      addYear(item.date)
    }
  })
  return years
})

const disabledChartYear = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return true
  return !chartYearsWithData.value.has(String(date.getFullYear()))
}

const normalizeDateKey = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10))) return text.slice(0, 10)
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return ''
  return `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`
}

const isInChartMonth = (item) => {
  const key = normalizeDateKey(item?.date)
  return Boolean(key && chartMonth.value && key.startsWith(chartMonth.value))
}

/** 本月完成：与右侧完成日历一致，按完成/重拼日期归属月份 */
const isCompletedInChartMonth = (item) => {
  if (!isPatternCompleted(item)) return false
  if (chartScope.value !== 'month') return true
  if (!chartMonth.value) return false
  return listPatternAssembleDates(item).some((date) => date.startsWith(chartMonth.value))
}

const buildPatternsByDate = (getDateKeys) => {
  const map = {}
  const push = (item, category, date) => {
    const key = normalizeDateKey(date)
    if (!key) return
    if (!map[key]) map[key] = []
    if (map[key].some((row) => row.id === item.id)) return
    map[key].push({ ...item, _category: category })
  }

  const resolveKeys = (item) => {
    const result = getDateKeys(item)
    if (Array.isArray(result)) return result
    return result ? [result] : []
  }

  memberPatterns.value.forEach((item) => {
    resolveKeys(item).forEach((date) => push(item, 'member', date))
  })
  normalPatterns.value.forEach((item) => {
    resolveKeys(item).forEach((date) => push(item, 'normal', date))
  })

  Object.values(map).forEach((list) => {
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'))
  })
  return map
}

const patternsByCompletedDate = computed(() =>
  buildPatternsByDate((item) => {
    if (!isPatternCompleted(item)) return []
    return listPatternAssembleDates(item)
  }),
)

const patternsByPatternDate = computed(() =>
  buildPatternsByDate((item) => normalizeDateKey(item.date)),
)

const activeCalendarData = computed(() =>
  calendarMode.value === 'pattern'
    ? patternsByPatternDate.value
    : patternsByCompletedDate.value,
)

const dayDialogPatterns = computed(
  () => activeCalendarData.value[selectedDay.value] || [],
)

const dayDialogTitle = computed(() => {
  if (!selectedDay.value) {
    return calendarMode.value === 'pattern' ? '当日新增图纸' : '当日完成图纸'
  }
  const [y, m, d] = selectedDay.value.split('-').map(Number)
  if (!y || !m || !d) {
    return calendarMode.value === 'pattern' ? '当日新增图纸' : '当日完成图纸'
  }
  const suffix = calendarMode.value === 'pattern' ? '新增图纸' : '完成图纸'
  return `${y}年${m}月${d}日 · ${suffix}`
})

const openDayPatterns = async (dateKey) => {
  selectedDay.value = dateKey
  // 等当前点击/图表更新收尾再开弹窗，避免 Teleport 卸载冲突
  await nextTick()
  dayDialogVisible.value = true
  const list = activeCalendarData.value[dateKey] || []
  const memberItems = list.filter((item) => item._category === 'member')
  const normalItems = list.filter((item) => item._category === 'normal')
  await Promise.all([
    loadPatternImages(memberItems, 'member'),
    loadPatternImages(normalItems, 'normal'),
  ])
}

watch(calendarMode, () => {
  selectedDay.value = ''
  dayDialogVisible.value = false
})

const patternTotal = computed(
  () => memberPatterns.value.length + normalPatterns.value.length,
)

const toolCount = computed(() => {
  void boardInventory
  void toolInventory
  return getTotalToolStock()
})

const memberCompletedCount = computed(() =>
  memberPatterns.value.filter(isCompletedInChartMonth).length,
)

const normalCompletedCount = computed(() =>
  normalPatterns.value.filter(isCompletedInChartMonth).length,
)

const completedCount = computed(
  () =>
    memberPatterns.value.filter(isPatternCompleted).length +
    normalPatterns.value.filter(isPatternCompleted).length,
)

/** 本月未完成：该月新增（图纸日期）且尚未完成 */
const memberPendingCount = computed(() =>
  memberPatterns.value.filter((item) => isInChartMonth(item) && !isPatternCompleted(item)).length,
)

const normalPendingCount = computed(() =>
  normalPatterns.value.filter((item) => isInChartMonth(item) && !isPatternCompleted(item)).length,
)

/** 「所有」：当年 1–12 月双柱（完成日期→已完成；图纸日期且未完成→未完成） */
const monthlyChartData = computed(() => {
  const year = String(chartYear.value || now.getFullYear())
  const completedIdsByMonth = new Map()
  const pendingIdsByMonth = new Map()

  const addId = (map, monthKey, id) => {
    if (!monthKey || !id || !monthKey.startsWith(year)) return
    if (!map.has(monthKey)) map.set(monthKey, new Set())
    map.get(monthKey).add(id)
  }

  const allPatterns = [...memberPatterns.value, ...normalPatterns.value]
  allPatterns.forEach((item) => {
    if (isPatternCompleted(item)) {
      listPatternAssembleDates(item).forEach((date) => {
        addId(completedIdsByMonth, date.slice(0, 7), item.id)
      })
    } else {
      const patternMonth = normalizeDateKey(item.date).slice(0, 7)
      addId(pendingIdsByMonth, patternMonth, item.id)
    }
  })

  const months = Array.from({ length: 12 }, (_, index) => `${year}-${pad2(index + 1)}`)

  return {
    categories: months.map((_, index) => `${index + 1}月`),
    completed: months.map((month) => completedIdsByMonth.get(month)?.size || 0),
    pending: months.map((month) => pendingIdsByMonth.get(month)?.size || 0),
  }
})

const completionRate = computed(() => {
  if (!patternTotal.value) return 0
  return Math.round((completedCount.value / patternTotal.value) * 100)
})

const toggleCostView = () => {
  costShowTotal.value = !costShowTotal.value
}

const stats = computed(() => [
  { key: 'pattern', label: '图纸总数', value: String(patternTotal.value) },
  { key: 'tool', label: '工具数量', value: String(toolCount.value) },
  {
    key: 'cost',
    label: costShowTotal.value ? '总共花费' : '本月花费',
    value: formatCostAmount(costShowTotal.value ? allTotal.value : monthTotal.value),
  },
  { key: 'completed', label: '完成作品', value: String(completedCount.value) },
])

const syncHomeData = async (userId) => {
  if (userId) {
    initBoardInventory(userId)
    initToolInventory(userId)
  }
  await loadPatterns(true)
}

onMounted(async () => {
  await syncHomeData(user.value?.id)
})

watch(
  () => user.value?.id,
  async (userId) => {
    if (userId) {
      costShowTotal.value = false
      await syncHomeData(userId)
    }
  },
)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  min-height: 0;
}

.stat-cards :deep(.el-col) {
  display: flex;
}

.stat-card {
  flex: 1;
  width: 100%;
  border-radius: 12px;
  border-top: 3px solid transparent;
}

.stat-card-pattern {
  border-top-color: #c49bff;
}

.stat-card-tool {
  border-top-color: #4a90e2;
}

.stat-card-cost {
  border-top-color: #ff9f43;
}

.stat-card-completed {
  border-top-color: #5ec9b8;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 92px;
  padding: 18px 20px;
}

.stat-card-clickable {
  cursor: pointer;
}

.stat-card-clickable:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-value {
  color: var(--el-color-primary);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.stat-tip {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-pale, #fdf5f8);
  color: var(--el-text-color-placeholder);
  font-size: 11px;
}

.overview-card {
  flex: 1;
  min-height: 0;
  border-radius: 12px;
}

.overview-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px;
  padding: 20px 24px;
}

.overview-header {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.overview-title h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 17px;
}

.overview-summary {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.overview-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-pale, #fdf5f8) 0%, #fff 100%);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.meta-value {
  color: var(--el-color-primary);
  font-size: 16px;
  font-weight: 700;
}

.meta-divider {
  width: 1px;
  height: 32px;
  background: var(--el-border-color-lighter, #f0e4ea);
}

.overview-charts {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-height: 0;
}

.chart-panel {
  display: flex;
  flex-direction: column;
  min-height: 260px;
  padding: 14px 14px 8px;
  border: 1px solid var(--el-border-color-lighter, #f0e4ea);
  border-radius: 10px;
  background: #fff;
}

.chart-panel-header {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--el-border-color-lighter, #f0e4ea);
}

.chart-title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.chart-scope-bar {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chart-picker-slot {
  display: inline-flex;
}

.chart-month-picker {
  width: 128px;
}

.chart-year-picker {
  width: 100px;
}

.chart-month-picker :deep(.el-input__wrapper),
.chart-year-picker :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #f0e4ea inset;
}

.chart-scope-toggle {
  display: inline-flex;
  padding: 2px;
  border: 1px solid #f0e4ea;
  border-radius: 8px;
  background: #f5eef2;
}

.chart-scope-btn {
  min-width: 44px;
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6e5660;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-scope-btn.active {
  background: #fff;
  color: #a83858;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(82, 64, 74, 0.08);
}

.calendar-panel {
  min-height: 300px;
}

@media (max-width: 900px) {
  .overview-charts {
    grid-template-columns: 1fr;
  }

  .overview-meta {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
