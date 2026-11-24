<template>
  <div class="completion-calendar">
    <div v-if="showModeTabs" class="cal-mode-tabs">
      <button
        type="button"
        class="cal-mode-tab"
        :class="{ 'cal-mode-tab-active': summaryMode === 'completed' }"
        @click="emit('update:summaryMode', 'completed')"
      >
        完成日历
      </button>
      <button
        type="button"
        class="cal-mode-tab"
        :class="{ 'cal-mode-tab-active': summaryMode === 'pattern' }"
        @click="emit('update:summaryMode', 'pattern')"
      >
        图纸日历
      </button>
    </div>

    <div class="cal-toolbar">
      <div class="cal-nav-group">
        <button
          type="button"
          class="cal-nav"
          aria-label="上个月"
          :disabled="!canPrevMonth"
          @click="shiftMonth(-1)"
        >
          ‹
        </button>
        <div ref="monthWrapRef" class="cal-month-wrap">
          <button
            type="button"
            class="cal-month-trigger"
            :class="{ 'is-open': monthPickerOpen }"
            :disabled="!selectableMonthRange"
            title="点击选择月份"
            @click.stop="toggleMonthPicker"
          >
            <span class="cal-month-label">{{ currentMonthLabel }}</span>
            <span class="cal-month-caret" :class="{ 'is-open': monthPickerOpen }" aria-hidden="true">▾</span>
          </button>
          <Transition name="cal-panel-fade">
            <div v-if="monthPickerOpen" class="cal-month-panel" @click.stop>
              <div class="cal-month-panel-head">
                <button
                  type="button"
                  class="cal-panel-nav"
                  aria-label="上一年"
                  :disabled="!canPickerPrevYear"
                  @click="shiftPickerYear(-1)"
                >
                  ‹
                </button>
                <span class="cal-panel-year">{{ pickerYear }}年</span>
                <button
                  type="button"
                  class="cal-panel-nav"
                  aria-label="下一年"
                  :disabled="!canPickerNextYear"
                  @click="shiftPickerYear(1)"
                >
                  ›
                </button>
              </div>
              <div class="cal-month-options">
                <button
                  v-for="month in 12"
                  :key="month"
                  type="button"
                  class="cal-month-option"
                  :class="{
                    'is-active': viewYear === pickerYear && viewMonth === month - 1,
                    'is-disabled': !isMonthSelectable(toMonthKey(pickerYear, month - 1)),
                  }"
                  :disabled="!isMonthSelectable(toMonthKey(pickerYear, month - 1))"
                  @click="pickMonth(pickerYear, month - 1)"
                >
                  {{ month }}月
                </button>
              </div>
            </div>
          </Transition>
        </div>
        <button
          type="button"
          class="cal-nav"
          aria-label="下个月"
          :disabled="!canNextMonth"
          @click="shiftMonth(1)"
        >
          ›
        </button>
      </div>
      <button
        type="button"
        class="cal-today"
        :disabled="!canGoToday"
        @click="goToday"
      >
        今天
      </button>
      <div class="cal-view-toggle" role="group" aria-label="视图切换">
        <button
          type="button"
          class="cal-view-btn"
          :class="{ active: viewMode === 'calendar' }"
          title="日历视图"
          @click="setViewMode('calendar')"
        >
          日历
        </button>
        <button
          type="button"
          class="cal-view-btn"
          :class="{ active: viewMode === 'chart' }"
          title="图表视图"
          @click="setViewMode('chart')"
        >
          图表
        </button>
      </div>
    </div>

    <div class="cal-meta">
      <p class="cal-summary">
        {{ monthSummaryPrefix }} <strong>{{ monthCount }}</strong> 张
        <template v-if="monthCount">
          ：会员 <strong>{{ monthMemberCount }}</strong> 张，付费
          <strong>{{ monthPaidCount }}</strong> 张，免费
          <strong>{{ monthFreeCount }}</strong> 张
          <span class="cal-summary-hint">· {{ clickHint }}</span>
        </template>
      </p>
      <div class="cal-legend">
        <span v-for="item in typeLegend" :key="item.key" class="cal-legend-item">
          <i class="cal-legend-dot" :class="`type-${item.key}`" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <template v-if="viewMode === 'calendar'">
      <div class="cal-weekdays">
        <span v-for="day in weekdays" :key="day" class="cal-weekday">{{ day }}</span>
      </div>

      <div class="cal-grid">
        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          class="cal-cell"
          :class="{
            'is-outside': !cell.inMonth,
            'is-today': cell.isToday,
            'has-done': cell.count > 0,
            'is-selected': cell.date === selectedDate,
          }"
          :disabled="!cell.inMonth || cell.count === 0"
          @click="onCellClick(cell)"
        >
          <span
            v-if="cell.count > 0"
            class="cal-total"
            :title="`${dayTotalLabel} ${cell.count} 张`"
          >
            {{ cell.count }}
          </span>
          <span class="cal-day">{{ cell.day }}</span>
          <span v-if="cell.count > 0" class="cal-badges">
            <span v-if="cell.free" class="cal-badge type-free" :title="`免费 ${cell.free}`">
              {{ cell.free }}
            </span>
            <span v-if="cell.member" class="cal-badge type-member" :title="`会员 ${cell.member}`">
              {{ cell.member }}
            </span>
            <span v-if="cell.paid" class="cal-badge type-paid" :title="`付费 ${cell.paid}`">
              {{ cell.paid }}
            </span>
          </span>
          <span v-else class="cal-badge-placeholder" />
        </button>
      </div>
    </template>

    <div v-else class="cal-chart-wrap">
      <div class="cal-chart-panel-tabs" role="tablist" aria-label="图表切换">
        <button
          type="button"
          class="cal-chart-panel-tab"
          :class="{ active: chartPanel === 'daily' }"
          @click="setChartPanel('daily')"
        >
          本月每日
        </button>
        <button
          type="button"
          class="cal-chart-panel-tab"
          :class="{ active: chartPanel === 'monthly' }"
          @click="setChartPanel('monthly')"
        >
          每月统计
        </button>
      </div>
      <p class="cal-chart-panel-hint">{{ chartPanelHint }}</p>
      <div
        class="cal-chart-slider"
        @pointerdown="onChartSwipeStart"
        @pointermove="onChartSwipeMove"
        @pointerup="onChartSwipeEnd"
        @pointercancel="onChartSwipeEnd"
      >
        <div
          class="cal-chart-track"
          :class="{ 'is-dragging': chartSwipe.active }"
          :style="chartTrackStyle"
        >
          <div class="cal-chart-slide">
            <BaseEchart
              ref="chartRef"
              :option="chartOption"
              :chart-events="chartEvents"
              class="cal-chart"
            />
          </div>
          <div class="cal-chart-slide">
            <BaseEchart
              ref="monthlyChartRef"
              :option="monthlyChartOption"
              :chart-events="monthlyChartEvents"
              class="cal-chart"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseEchart from '@/components/charts/BaseEchart.vue'
import { getAuthorPatternTrendChartOption } from '@/view/author/utils/authorPatternTrend'

const props = defineProps({
  /** Map-like: { 'YYYY-MM-DD': Pattern[] } or Record */
  patternsByDate: {
    type: Object,
    default: () => ({}),
  },
  summaryMode: {
    type: String,
    default: 'completed',
    validator: (value) => ['completed', 'pattern'].includes(value),
  },
  /** 是否显示「完成日历 / 图纸日历」切换 */
  showModeTabs: {
    type: Boolean,
    default: true,
  },
  /**
   * 可选月份范围：
   * - through-today：最早有数据的月 ~ 当前月（首页默认）
   * - data：最早 ~ 最晚有数据的月（作者每月图纸用）
   */
  rangeMode: {
    type: String,
    default: 'through-today',
    validator: (value) => ['through-today', 'data'].includes(value),
  },
  /** 外部指定当前展示月 YYYY-MM；变化时同步日历 */
  month: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-date', 'update:summaryMode', 'update:month'])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const typeLegend = [
  { key: 'free', label: '免费' },
  { key: 'member', label: '会员' },
  { key: 'paid', label: '付费' },
]

const pad2 = (n) => String(n).padStart(2, '0')

const toDateKey = (year, monthIndex, day) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`

const toMonthKey = (year, monthIndex) => `${year}-${pad2(monthIndex + 1)}`

const parseMonthKey = (monthKey) => {
  const [yearText, monthText] = String(monthKey || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  return { year, monthIndex: month - 1, key: `${year}-${pad2(month)}` }
}

const now = new Date()
const initialMonth = parseMonthKey(props.month)
const viewYear = ref(initialMonth?.year ?? now.getFullYear())
const viewMonth = ref(initialMonth?.monthIndex ?? now.getMonth()) // 0-11
const selectedDate = ref('')
const monthPickerOpen = ref(false)
const pickerYear = ref(initialMonth?.year ?? now.getFullYear())
const monthWrapRef = ref(null)
/** calendar | chart */
const viewMode = ref('calendar')
/** daily | monthly — 图表视图左右滑动切换 */
const chartPanel = ref('daily')
const chartRef = ref(null)
const monthlyChartRef = ref(null)
const chartSwipe = ref({
  active: false,
  startX: 0,
  deltaX: 0,
  width: 0,
})

const extractMonthKey = (dateKey) => {
  const text = String(dateKey || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7)
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return ''
  return `${match[1]}-${pad2(Number(match[2]))}`
}

const todayKey = computed(() => {
  const d = new Date()
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
})

const todayMonthKey = computed(() => {
  const d = new Date()
  return toMonthKey(d.getFullYear(), d.getMonth())
})

/**
 * 可选月份范围
 * through-today：最早有数据的月 ~ 当前月
 * data：最早 ~ 最晚有数据的月
 */
const selectableMonthRange = computed(() => {
  let min = ''
  let dataMax = ''
  Object.entries(props.patternsByDate || {}).forEach(([dateKey, list]) => {
    if (!Array.isArray(list) || !list.length) return
    const monthKey = extractMonthKey(dateKey)
    if (!monthKey) return
    if (!min || monthKey < min) min = monthKey
    if (!dataMax || monthKey > dataMax) dataMax = monthKey
  })
  if (!min) return null
  if (props.rangeMode === 'data') {
    return { min, max: dataMax || min }
  }
  const max = todayMonthKey.value
  return { min: min > max ? max : min, max }
})

const emptyTypeCounts = () => ({ free: 0, member: 0, paid: 0, count: 0 })

const getTypeCounts = (dateKey) => {
  const list = props.patternsByDate?.[dateKey]
  const counts = emptyTypeCounts()
  if (!Array.isArray(list)) return counts
  list.forEach((item) => {
    if (item?.type === 'paid') counts.paid += 1
    else if (item?.type === 'member') counts.member += 1
    else counts.free += 1
  })
  counts.count = counts.free + counts.member + counts.paid
  return counts
}

const applyMonthKey = (monthKey, { emitChange = true } = {}) => {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return
  const prev = toMonthKey(viewYear.value, viewMonth.value)
  viewYear.value = parsed.year
  viewMonth.value = parsed.monthIndex
  if (emitChange && prev !== parsed.key) {
    emit('update:month', parsed.key)
  }
}

const isMonthSelectable = (monthKey) => {
  const range = selectableMonthRange.value
  if (!range || !monthKey) return false
  return monthKey >= range.min && monthKey <= range.max
}

const clampViewToRange = () => {
  const range = selectableMonthRange.value
  if (!range) return
  const preferred = parseMonthKey(props.month)
  if (preferred && preferred.key >= range.min && preferred.key <= range.max) {
    applyMonthKey(preferred.key, { emitChange: false })
    return
  }
  const current = toMonthKey(viewYear.value, viewMonth.value)
  if (current < range.min) applyMonthKey(range.min, { emitChange: false })
  else if (current > range.max) applyMonthKey(range.max, { emitChange: false })
}

const currentMonthLabel = computed(
  () => `${viewYear.value}年${viewMonth.value + 1}月`,
)

const currentMonthKey = computed(() => toMonthKey(viewYear.value, viewMonth.value))

const selectableYears = computed(() => {
  const range = selectableMonthRange.value
  if (!range) return [viewYear.value]
  const minYear = Number(range.min.slice(0, 4))
  const maxYear = Number(range.max.slice(0, 4))
  const years = []
  for (let year = minYear; year <= maxYear; year += 1) {
    years.push(year)
  }
  return years
})

const pickerYearIndex = computed(() => selectableYears.value.indexOf(pickerYear.value))

const canPickerPrevYear = computed(() => pickerYearIndex.value > 0)

const canPickerNextYear = computed(() => {
  const idx = pickerYearIndex.value
  return idx >= 0 && idx < selectableYears.value.length - 1
})

const shiftPickerYear = (delta) => {
  const years = selectableYears.value
  const nextIdx = pickerYearIndex.value + delta
  if (nextIdx < 0 || nextIdx >= years.length) return
  pickerYear.value = years[nextIdx]
}

const toggleMonthPicker = () => {
  if (!selectableMonthRange.value) return
  monthPickerOpen.value = !monthPickerOpen.value
  if (monthPickerOpen.value) {
    pickerYear.value = viewYear.value
  }
}

const pickMonth = (year, monthIndex) => {
  const monthKey = toMonthKey(year, monthIndex)
  if (!isMonthSelectable(monthKey)) return
  applyMonthKey(monthKey)
  monthPickerOpen.value = false
}

const closeMonthPicker = () => {
  monthPickerOpen.value = false
}

const onDocumentClick = (event) => {
  if (!monthPickerOpen.value) return
  if (monthWrapRef.value?.contains(event.target)) return
  closeMonthPicker()
}

watch(monthPickerOpen, (open) => {
  if (open) {
    document.addEventListener('click', onDocumentClick)
  } else {
    document.removeEventListener('click', onDocumentClick)
  }
})

watch(selectableYears, (years) => {
  if (!years.length) return
  if (!years.includes(pickerYear.value)) {
    pickerYear.value = years[years.length - 1]
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

const monthSummaryPrefix = computed(() =>
  props.summaryMode === 'pattern' ? '本月新增' : '本月完成',
)

const dayTotalLabel = computed(() =>
  props.summaryMode === 'pattern' ? '当日新增' : '当日完成',
)

const clickHint = computed(() => {
  if (viewMode.value !== 'chart') return '点击日期查看'
  return chartPanel.value === 'monthly' ? '点击切换月份' : '点击柱状图查看'
})

const chartPanelHint = computed(() =>
  chartPanel.value === 'monthly'
    ? '左右滑动切换 · 点击柱状图切换月份'
    : '左右滑动切换 · 点击柱状图查看当日',
)

const chartTrackStyle = computed(() => {
  const base = chartPanel.value === 'monthly' ? -50 : 0
  const width = chartSwipe.value.width || 1
  const dragPercent = chartSwipe.value.active
    ? (chartSwipe.value.deltaX / width) * 50
    : 0
  const offset = Math.max(-50, Math.min(0, base + dragPercent))
  return { transform: `translate3d(${offset}%, 0, 0)` }
})

const chartEmptyText = computed(() =>
  props.summaryMode === 'pattern' ? '本月暂无新增数据' : '本月暂无完成数据',
)

const monthlyChartEmptyText = computed(() =>
  props.summaryMode === 'pattern' ? '暂无新增数据' : '暂无完成数据',
)

const accumulateTypeCounts = (prefix) => {
  const counts = emptyTypeCounts()
  Object.entries(props.patternsByDate || {}).forEach(([key, list]) => {
    if (!key.startsWith(prefix) || !Array.isArray(list)) return
    list.forEach((item) => {
      if (item?.type === 'paid') counts.paid += 1
      else if (item?.type === 'member') counts.member += 1
      else counts.free += 1
    })
  })
  counts.count = counts.free + counts.member + counts.paid
  return counts
}

const monthTypeCounts = computed(() => {
  const counts = accumulateTypeCounts(
    `${toMonthKey(viewYear.value, viewMonth.value)}-`,
  )
  return counts || emptyTypeCounts()
})

const monthMemberCount = computed(() => monthTypeCounts.value?.member || 0)
const monthPaidCount = computed(() => monthTypeCounts.value?.paid || 0)
const monthFreeCount = computed(() => monthTypeCounts.value?.free || 0)

const dailyChartData = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const dayCount = new Date(year, month + 1, 0).getDate()
  const labels = []
  const keys = []
  const free = []
  const paid = []
  const member = []
  const totals = []

  for (let day = 1; day <= dayCount; day += 1) {
    const dateKey = toDateKey(year, month, day)
    const counts = getTypeCounts(dateKey)
    labels.push(String(day))
    keys.push(dateKey)
    free.push(counts.free)
    paid.push(counts.paid)
    member.push(counts.member)
    totals.push(counts.count)
  }

  return { labels, keys, free, paid, member, totals }
})

const monthlyChartData = computed(() => {
  const range = selectableMonthRange.value
  if (!range) {
    return { labels: [], keys: [], free: [], paid: [], member: [], totals: [] }
  }

  const labels = []
  const keys = []
  const free = []
  const paid = []
  const member = []
  const totals = []

  let year = Number(range.min.slice(0, 4))
  let month = Number(range.min.slice(5, 7))
  const endYear = Number(range.max.slice(0, 4))
  const endMonth = Number(range.max.slice(5, 7))

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthKey = toMonthKey(year, month - 1)
    const counts = accumulateTypeCounts(`${monthKey}-`)
    labels.push(`${String(year).slice(2)}年${month}月`)
    keys.push(monthKey)
    free.push(counts.free)
    paid.push(counts.paid)
    member.push(counts.member)
    totals.push(counts.count)

    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return { labels, keys, free, paid, member, totals }
})

const chartOption = computed(() =>
  getAuthorPatternTrendChartOption(dailyChartData.value, {
    emptyText: chartEmptyText.value,
    clickable: true,
  }),
)

const monthlyChartOption = computed(() =>
  getAuthorPatternTrendChartOption(monthlyChartData.value, {
    emptyText: monthlyChartEmptyText.value,
    clickable: true,
    scrollable: true,
    visibleCount: 12,
    tipHint:
      '<br/><span style="color:#9a8a92;font-size:11px">点击切换到该月</span>',
    labelRotate: 30,
  }),
)

const onChartClick = (params) => {
  if (params?.componentType !== 'series') return
  const index = Number(params.dataIndex)
  if (!Number.isFinite(index) || index < 0) return
  const dateKey = dailyChartData.value.keys[index]
  if (!dateKey || getCount(dateKey) <= 0) return
  selectedDate.value = dateKey
  emit('select-date', dateKey)
}

const onMonthlyChartClick = (params) => {
  if (params?.componentType !== 'series') return
  const index = Number(params.dataIndex)
  if (!Number.isFinite(index) || index < 0) return
  const monthKey = monthlyChartData.value.keys[index]
  if (!monthKey || !isMonthSelectable(monthKey)) return
  applyMonthKey(monthKey)
}

const chartEvents = { click: onChartClick }
const monthlyChartEvents = { click: onMonthlyChartClick }

const resizeCharts = () => {
  chartRef.value?.resize()
  monthlyChartRef.value?.resize()
}

const setChartPanel = (panel) => {
  if (chartPanel.value === panel) return
  chartPanel.value = panel
  chartSwipe.value = { active: false, startX: 0, deltaX: 0, width: 0 }
  nextTick(() => resizeCharts())
}

const onChartSwipeStart = (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const target = event.currentTarget
  chartSwipe.value = {
    active: true,
    startX: event.clientX,
    deltaX: 0,
    width: target?.clientWidth || 1,
  }
  target?.setPointerCapture?.(event.pointerId)
}

const onChartSwipeMove = (event) => {
  if (!chartSwipe.value.active) return
  chartSwipe.value = {
    ...chartSwipe.value,
    deltaX: event.clientX - chartSwipe.value.startX,
  }
}

const onChartSwipeEnd = () => {
  if (!chartSwipe.value.active) return
  const { deltaX, width } = chartSwipe.value
  const threshold = Math.min(72, Math.max(40, width * 0.18))
  if (deltaX <= -threshold) setChartPanel('monthly')
  else if (deltaX >= threshold) setChartPanel('daily')
  else {
    chartSwipe.value = { active: false, startX: 0, deltaX: 0, width: 0 }
  }
}

const setViewMode = (mode) => {
  if (viewMode.value === mode) return
  viewMode.value = mode
  closeMonthPicker()
  if (mode === 'chart') {
    nextTick(() => resizeCharts())
  }
}

const setViewMonth = (year, monthIndex) => {
  const monthKey = toMonthKey(year, monthIndex)
  if (!isMonthSelectable(monthKey)) {
    clampViewToRange()
    return
  }
  applyMonthKey(monthKey)
}

const canPrevMonth = computed(() => {
  const range = selectableMonthRange.value
  if (!range) return false
  return currentMonthKey.value > range.min
})

const canNextMonth = computed(() => {
  const range = selectableMonthRange.value
  if (!range) return false
  return currentMonthKey.value < range.max
})

const canGoToday = computed(() => {
  const range = selectableMonthRange.value
  if (!range) return false
  return isMonthSelectable(todayMonthKey.value)
})

const getCount = (dateKey) => getTypeCounts(dateKey).count

const monthCount = computed(() => monthTypeCounts.value?.count || 0)

const makeCell = (day, date, inMonth) => {
  const counts = {
    ...emptyTypeCounts(),
    ...(inMonth ? getTypeCounts(date) : null),
  }
  return {
    key: inMonth ? date : `out-${date}`,
    day,
    date,
    inMonth,
    isToday: inMonth && date === todayKey.value,
    free: counts.free || 0,
    member: counts.member || 0,
    paid: counts.paid || 0,
    count: counts.count || 0,
  }
}

const cells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const result = []

  for (let i = 0; i < firstWeekday; i += 1) {
    const day = prevMonthDays - firstWeekday + 1 + i
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    result.push(makeCell(day, toDateKey(prevYear, prevMonth, day), false))
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    result.push(makeCell(day, toDateKey(year, month, day), true))
  }

  const remainder = result.length % 7
  const trailing = remainder === 0 ? 0 : 7 - remainder
  for (let i = 1; i <= trailing; i += 1) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    result.push(makeCell(i, toDateKey(nextYear, nextMonth, i), false))
  }

  return result
})

const shiftMonth = (delta) => {
  if (delta < 0 && !canPrevMonth.value) return
  if (delta > 0 && !canNextMonth.value) return
  const d = new Date(viewYear.value, viewMonth.value + delta, 1)
  setViewMonth(d.getFullYear(), d.getMonth())
}

const goToday = () => {
  if (!canGoToday.value) return
  const d = new Date()
  setViewMonth(d.getFullYear(), d.getMonth())
  const key = todayKey.value
  if (getCount(key) > 0) {
    selectedDate.value = key
    emit('select-date', key)
  }
}

const onCellClick = (cell) => {
  if (!cell.inMonth || cell.count <= 0) return
  selectedDate.value = cell.date
  emit('select-date', cell.date)
}

watch(
  () => props.patternsByDate,
  () => {
    clampViewToRange()
    if (selectedDate.value && getCount(selectedDate.value) === 0) {
      selectedDate.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => props.summaryMode,
  () => {
    selectedDate.value = ''
    closeMonthPicker()
    clampViewToRange()
  },
)

watch(
  [
    viewMode,
    chartPanel,
    currentMonthKey,
    () => props.patternsByDate,
    () => props.summaryMode,
  ],
  () => {
    if (viewMode.value !== 'chart') return
    nextTick(() => resizeCharts())
  },
)

watch(
  () => props.month,
  (monthKey) => {
    if (!monthKey) return
    const parsed = parseMonthKey(monthKey)
    if (!parsed) return
    const current = toMonthKey(viewYear.value, viewMonth.value)
    if (current === parsed.key) return
    if (isMonthSelectable(parsed.key)) {
      applyMonthKey(parsed.key, { emitChange: false })
    } else {
      clampViewToRange()
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.completion-calendar {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 2px 2px 4px;
}

.cal-mode-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  margin-bottom: 10px;
  padding: 3px;
  border-radius: 8px;
  background: var(--color-pale, #fdf5f8);
}

.cal-mode-tab {
  flex: 1;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-mode-tab-active {
  background: #fff;
  color: var(--el-text-color-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(250, 208, 196, 0.35);
}

.cal-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.cal-view-toggle {
  display: inline-flex;
  padding: 2px;
  border: 1px solid #f0e4ea;
  border-radius: 8px;
  background: #f5eef2;
}

.cal-view-btn {
  min-width: 44px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6e5660;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-view-btn.active {
  background: #fff;
  color: #a83858;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(82, 64, 74, 0.08);
}

.cal-nav-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 2px;
  border: 1px solid #f0e4ea;
  border-radius: 999px;
  background: linear-gradient(180deg, #fffafb 0%, #fdf5f8 100%);
}

.cal-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #8a7a82;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-nav:hover:not(:disabled) {
  background: #fff;
  color: #e891a8;
  box-shadow: 0 1px 4px rgba(232, 145, 168, 0.18);
}

.cal-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cal-month-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 112px;
}

.cal-month-trigger {
  position: relative;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 28px;
  padding: 0 20px 0 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #52404a;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-month-trigger:hover:not(:disabled),
.cal-month-trigger.is-open {
  background: #fff;
  box-shadow: 0 1px 4px rgba(232, 145, 168, 0.16);
}

.cal-month-trigger:focus-visible:not(:disabled) {
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(232, 145, 168, 0.22);
}

.cal-month-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-month-label {
  white-space: nowrap;
}

.cal-month-caret {
  position: absolute;
  top: 50%;
  right: 8px;
  color: #c4a8b4;
  font-size: 10px;
  line-height: 1;
  pointer-events: none;
  transform: translateY(-50%);
  transition: transform 0.2s ease, color 0.2s ease;
}

.cal-month-caret.is-open {
  color: #e891a8;
  transform: translateY(-50%) rotate(180deg);
}

.cal-month-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 30;
  width: 248px;
  padding: 12px;
  border: 1px solid #f0e4ea;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #fffafb 100%);
  box-shadow:
    0 10px 28px rgba(36, 24, 32, 0.1),
    0 2px 8px rgba(232, 145, 168, 0.08);
  transform: translateX(-50%);
}

.cal-month-panel::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 10px;
  height: 10px;
  border-top: 1px solid #f0e4ea;
  border-left: 1px solid #f0e4ea;
  background: #fff;
  transform: translateX(-50%) rotate(45deg);
}

.cal-month-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #f0e4ea;
}

.cal-panel-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: #fdf5f8;
  color: #8a7a82;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-panel-nav:hover:not(:disabled) {
  background: #fff;
  color: #e891a8;
  box-shadow: 0 1px 4px rgba(232, 145, 168, 0.18);
}

.cal-panel-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cal-panel-year {
  flex: 1;
  color: #52404a;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.cal-month-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.cal-month-option {
  height: 32px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #faf7fb;
  color: #6f5f67;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cal-month-option:hover:not(:disabled) {
  border-color: #f0d4e0;
  background: #fff;
  color: #52404a;
}

.cal-month-option.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #ffd8e2 0%, #e891a8 100%);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(232, 145, 168, 0.28);
}

.cal-month-option.is-disabled,
.cal-month-option:disabled {
  background: transparent;
  color: #ddd2d8;
  cursor: not-allowed;
}

.cal-panel-fade-enter-active,
.cal-panel-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cal-panel-fade-enter-from,
.cal-panel-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.cal-panel-fade-enter-to,
.cal-panel-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.cal-today {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #f0e4ea;
  border-radius: 999px;
  background: #fff;
  color: #8a7a82;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cal-today:hover:not(:disabled) {
  border-color: #e8c0cc;
  color: #e891a8;
  background: #fffafb;
}

.cal-today:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cal-meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}

.cal-summary {
  margin: 0;
  color: #8a7a82;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}

.cal-summary strong {
  margin: 0 2px;
  color: #e891a8;
  font-size: 13px;
  font-weight: 700;
}

.cal-summary-hint {
  color: #b8a8b0;
}

.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.cal-legend-item {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: #9a8a92;
  font-size: 11px;
}

.cal-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}

.cal-legend-dot.type-free,
.cal-badge.type-free {
  background: #5ec9b8;
}

.cal-legend-dot.type-member,
.cal-badge.type-member {
  background: #c49bff;
}

.cal-legend-dot.type-paid,
.cal-badge.type-paid {
  background: #ff8fa3;
}

.cal-chart-wrap {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.cal-chart-panel-tabs {
  display: inline-flex;
  flex-shrink: 0;
  align-self: center;
  padding: 2px;
  border: 1px solid #f0e4ea;
  border-radius: 8px;
  background: #f5eef2;
}

.cal-chart-panel-tab {
  min-width: 72px;
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

.cal-chart-panel-tab.active {
  background: #fff;
  color: #a83858;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(82, 64, 74, 0.08);
}

.cal-chart-panel-hint {
  flex-shrink: 0;
  margin: 0;
  color: #b8a8b0;
  font-size: 11px;
  text-align: center;
}

.cal-chart-slider {
  flex: 1;
  min-height: 220px;
  overflow: hidden;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
}

.cal-chart-slider:active {
  cursor: grabbing;
}

.cal-chart-track {
  display: flex;
  width: 200%;
  height: 100%;
  transition: transform 0.28s ease;
  will-change: transform;
}

.cal-chart-track.is-dragging {
  transition: none;
}

.cal-chart-slide {
  display: flex;
  flex: 0 0 50%;
  width: 50%;
  height: 100%;
  min-height: 220px;
}

.cal-chart {
  flex: 1;
  width: 100%;
  min-height: 220px;
}

.cal-weekdays {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 4px;
}

.cal-weekday {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.cal-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(54px, 1fr);
  gap: 5px;
  min-height: 0;
}

.cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 54px;
  padding: 8px 4px 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--el-text-color-primary);
  cursor: default;
  transition: all 0.15s ease;
}

.cal-cell.is-outside {
  color: var(--el-text-color-placeholder);
  opacity: 0.45;
}

.cal-cell.has-done {
  background: linear-gradient(180deg, #fcfafc 0%, #f7f2f6 100%);
  border-color: #eee4ef;
  cursor: pointer;
}

.cal-cell.has-done:hover {
  border-color: #dccfe2;
  background: #fff;
  box-shadow: 0 4px 12px rgba(110, 86, 96, 0.08);
  transform: translateY(-1px);
}

.cal-cell.is-today .cal-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-weight: 700;
}

.cal-cell.is-selected.has-done {
  border-color: #c49bff;
  box-shadow: 0 0 0 1px rgba(196, 155, 255, 0.35) inset;
}

.cal-cell:disabled {
  cursor: default;
}

.cal-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.cal-total {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(110, 86, 96, 0.12);
  color: #8a6f7a;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}

.cal-cell.has-done:hover .cal-total,
.cal-cell.is-selected.has-done .cal-total,
.cal-cell.is-today .cal-total {
  background: rgba(168, 56, 88, 0.1);
  box-shadow: none;
  color: #a83858;
}

.cal-badges {
  display: flex;
  flex-wrap: nowrap;
  gap: 3px;
  align-items: center;
  justify-content: center;
  max-width: 100%;
}

.cal-badge {
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
}

.cal-badge-placeholder {
  height: 15px;
}
</style>
