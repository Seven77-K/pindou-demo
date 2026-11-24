<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>{{ titleText }}</h4>
            <p class="header-sub">{{ subText }}</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body" :class="{ 'is-day': level === 'day', 'is-month': level === 'month' }">
          <div v-if="hasOverview" class="stats-row">
            <span class="stat-pill stat-total">合计 {{ overviewSummary.total }} 张</span>
            <span class="stat-pill type-free">免费 {{ overviewSummary.free }}</span>
            <span class="stat-pill type-paid">付费 {{ overviewSummary.paid }}</span>
            <span class="stat-pill type-member">会员 {{ overviewSummary.member }}</span>
          </div>

          <div v-if="analysis" class="analysis-panel">
            <div class="analysis-head">
              <span class="analysis-title">分析</span>
              <span class="analysis-desc">{{ analysis.sentences[0] }}</span>
            </div>
            <div class="analysis-grid">
              <div v-for="item in analysis.items" :key="item.key" class="analysis-card">
                <span class="analysis-label">{{ item.label }}</span>
                <strong class="analysis-value">{{ item.value }}</strong>
                <em v-if="item.tip" class="analysis-tip">{{ item.tip }}</em>
              </div>
            </div>
            <p v-if="analysis.sentences.length > 1" class="analysis-note">
              {{ analysis.sentences.slice(1).join(' ') }}
            </p>
          </div>

          <div v-if="level === 'month'" class="month-view">
            <template v-if="monthCards.length">
              <div class="month-chart-panel">
                <div class="month-chart-head">
                  <span class="month-chart-title">每月图纸趋势</span>
                  <span class="month-chart-hint">点击柱子查看该月明细</span>
                </div>
                <BaseEchart
                  :option="monthChartOption"
                  :chart-events="monthChartEvents"
                  class="month-chart"
                />
              </div>
              <div class="month-cards-pane">
                <section v-for="group in yearGroups" :key="group.year" class="year-block">
                  <div class="year-head">
                    <span class="year-title">{{ group.year }} 年</span>
                  </div>
                  <div class="month-grid">
                    <button
                      v-for="card in group.cards"
                      :key="card.key"
                      type="button"
                      class="month-card"
                      @click="openMonth(card.key)"
                    >
                      <div class="month-banner">
                        <span class="month-label">{{ card.month }}月</span>
                        <span class="month-total-tag">{{ card.total }} 张</span>
                      </div>
                      <div class="month-body">
                        <div class="share-track" aria-hidden="true">
                          <i
                            v-if="card.free"
                            class="share-seg is-free"
                            :style="{ width: shareWidth(card, 'free') }"
                          />
                          <i
                            v-if="card.paid"
                            class="share-seg is-paid"
                            :style="{ width: shareWidth(card, 'paid') }"
                          />
                          <i
                            v-if="card.member"
                            class="share-seg is-member"
                            :style="{ width: shareWidth(card, 'member') }"
                          />
                        </div>
                        <div class="type-chips">
                          <span class="chip chip-free">免费 {{ card.free }}</span>
                          <span class="chip chip-paid">付费 {{ card.paid }}</span>
                          <span class="chip chip-member">会员 {{ card.member }}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </section>
              </div>
            </template>
            <p v-else class="empty-text">该作者暂无带日期的图纸数据</p>
          </div>

          <div v-else class="day-view">
            <HomeCompletionCalendar
              v-if="hasDayData"
              :key="calendarKey"
              :patterns-by-date="patternsByDate"
              summary-mode="pattern"
              :show-mode-tabs="false"
              range-mode="data"
              :month="selectedMonth"
              @update:month="onCalendarMonthChange"
              @select-date="openDayPatterns"
            />
            <p v-else class="empty-text">该月暂无图纸数据</p>
          </div>
        </div>

        <div class="dialog-footer">
          <button v-if="level === 'day'" type="button" class="btn-secondary" @click="backToMonth">
            返回月份
          </button>
          <button type="button" class="btn-cancel" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>

  <AuthorCompletedPatternsDialog
    v-model:visible="dayDialogVisible"
    :author="author"
    :title="dayDialogTitle"
    :patterns="dayDialogPatterns"
    :show-buyer="Boolean(buyer)"
    show-amount
    list-hint="新增图纸"
    :overlay-z-index="2200"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseEchart from '@/components/charts/BaseEchart.vue'
import { loadPatternImages, usePatternData } from '@/composables/usePatternData'
import HomeCompletionCalendar from '@/view/home/components/HomeCompletionCalendar.vue'
import AuthorCompletedPatternsDialog from '@/view/statistics/components/AuthorCompletedPatternsDialog.vue'
import {
  buildAuthorDayAnalysis,
  buildAuthorMonthAnalysis,
  buildAuthorPatternDailyTrend,
  buildAuthorPatternMonthCards,
  buildAuthorPatternMonthlyTrend,
  formatAuthorTrendMonthTitle,
  getAuthorPatternTrendChartOption,
} from '@/view/author/utils/authorPatternTrend'

const props = defineProps({
  visible: { type: Boolean, default: false },
  author: { type: String, default: '' },
  buyer: { type: String, default: '' },
})

const emit = defineEmits(['update:visible'])

const { memberPatterns } = usePatternData()

const level = ref('month')
const selectedMonth = ref('')
const dayDialogVisible = ref(false)
const selectedDay = ref('')

const normalizeDateKey = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10))) return text.slice(0, 10)
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`
}

const authorPatterns = computed(() => {
  const authorName = String(props.author || '').trim()
  const buyerKeyword = String(props.buyer || '').trim()
  if (!authorName) return []
  return memberPatterns.value.filter((item) => {
    if (String(item.author || '').trim() !== authorName) return false
    if (buyerKeyword && String(item.buyer || '').trim() !== buyerKeyword) return false
    return Boolean(normalizeDateKey(item.date))
  })
})

const patternsByDate = computed(() => {
  const map = {}
  authorPatterns.value.forEach((item) => {
    const key = normalizeDateKey(item.date)
    if (!key) return
    if (!map[key]) map[key] = []
    map[key].push(item)
  })
  Object.values(map).forEach((list) => {
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'))
  })
  return map
})

const monthCards = computed(() =>
  buildAuthorPatternMonthCards(memberPatterns.value, props.author, {
    buyer: props.buyer,
  }),
)

const monthlyTrendData = computed(() =>
  buildAuthorPatternMonthlyTrend(memberPatterns.value, props.author, {
    buyer: props.buyer,
  }),
)

const monthChartOption = computed(() =>
  getAuthorPatternTrendChartOption(monthlyTrendData.value, {
    emptyText: '暂无每月图纸数据',
    clickable: true,
    tipHint: '<br/><span style="color:#9a8a92;font-size:11px">点击查看该月明细</span>',
    scrollable: (monthlyTrendData.value.keys || []).length > 12,
    visibleCount: 12,
    showLegend: true,
  }),
)

const onMonthChartClick = (params) => {
  if (params?.componentType !== 'series') return
  const index = Number(params.dataIndex)
  if (!Number.isFinite(index) || index < 0) return
  const monthKey = monthlyTrendData.value.keys?.[index]
  if (!monthKey) return
  openMonth(monthKey)
}

const monthChartEvents = { click: onMonthChartClick }

const yearGroups = computed(() => {
  const map = new Map()
  monthCards.value.forEach((card) => {
    if (!map.has(card.year)) map.set(card.year, [])
    map.get(card.year).push(card)
  })
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, cards]) => ({
      year,
      cards: [...cards].sort((a, b) => b.month - a.month),
    }))
})

const dailyData = computed(() =>
  buildAuthorPatternDailyTrend(memberPatterns.value, props.author, selectedMonth.value, {
    buyer: props.buyer,
  }),
)

const hasOverview = computed(() =>
  level.value === 'month'
    ? monthCards.value.some((card) => card.total > 0)
    : (dailyData.value.totals || []).some((value) => value > 0),
)

const hasDayData = computed(() =>
  Object.keys(patternsByDate.value).some((key) => key.startsWith(`${selectedMonth.value}-`))
    || Object.keys(patternsByDate.value).length > 0,
)

const overviewSummary = computed(() => {
  if (level.value === 'day') {
    const sum = (list = []) => list.reduce((acc, n) => acc + (Number(n) || 0), 0)
    return {
      total: sum(dailyData.value.totals),
      free: sum(dailyData.value.free),
      paid: sum(dailyData.value.paid),
      member: sum(dailyData.value.member),
    }
  }
  return monthCards.value.reduce(
    (acc, card) => {
      acc.total += card.total
      acc.free += card.free
      acc.paid += card.paid
      acc.member += card.member
      return acc
    },
    { total: 0, free: 0, paid: 0, member: 0 },
  )
})

const analysis = computed(() => {
  if (level.value === 'day') {
    return buildAuthorDayAnalysis(dailyData.value, selectedMonth.value)
  }
  return buildAuthorMonthAnalysis(monthCards.value)
})

const titleText = computed(() => {
  if (level.value === 'day') {
    return `${props.author} · ${formatAuthorTrendMonthTitle(selectedMonth.value)}`
  }
  return `${props.author} · 每月图纸`
})

const subText = computed(() => {
  if (level.value === 'day') {
    return '日历为每日新增图纸，点击日期查看明细'
  }
  return '点击月份查看每日明细'
})

const calendarKey = computed(
  () => `${props.author}-${props.buyer}-cal-${selectedMonth.value || 'none'}`,
)

const dayDialogPatterns = computed(() => patternsByDate.value[selectedDay.value] || [])

const dayDialogTitle = computed(() => {
  if (!selectedDay.value) return '当日新增图纸'
  const [y, m, d] = selectedDay.value.split('-').map(Number)
  if (!y || !m || !d) return '当日新增图纸'
  return `${props.author} · ${y}年${m}月${d}日 · 新增图纸`
})

const openMonth = (monthKey) => {
  if (!monthKey) return
  selectedMonth.value = monthKey
  level.value = 'day'
  dayDialogVisible.value = false
  selectedDay.value = ''
}

const onCalendarMonthChange = (monthKey) => {
  if (!monthKey || monthKey === selectedMonth.value) return
  selectedMonth.value = monthKey
  dayDialogVisible.value = false
  selectedDay.value = ''
}

const openDayPatterns = async (dateKey) => {
  selectedDay.value = dateKey
  dayDialogVisible.value = true
  await loadPatternImages(patternsByDate.value[dateKey] || [], 'member')
}

const shareWidth = (card, key) => {
  const total = Number(card?.total) || 0
  if (!total) return '0%'
  const value = Number(card?.[key]) || 0
  return `${Math.max((value / total) * 100, value > 0 ? 6 : 0)}%`
}

const backToMonth = () => {
  level.value = 'month'
  selectedMonth.value = ''
  dayDialogVisible.value = false
  selectedDay.value = ''
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(
  () => [props.visible, props.author, props.buyer],
  ([visible]) => {
    if (!visible) {
      level.value = 'month'
      selectedMonth.value = ''
      dayDialogVisible.value = false
      selectedDay.value = ''
      return
    }
    level.value = 'month'
    selectedMonth.value = ''
    dayDialogVisible.value = false
    selectedDay.value = ''
  },
)
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: rgba(36, 24, 32, 0.48);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(1360px, 96vw);
  height: min(94vh, 980px);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(82, 64, 74, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px 14px;
  border-bottom: 1px solid #f0e8ec;
}

.header-text h4 {
  margin: 0;
  color: #3d2f36;
  font-size: 17px;
  font-weight: 650;
}

.header-sub {
  margin: 4px 0 0;
  color: #9a8790;
  font-size: 12px;
  line-height: 1.5;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f6f0f3;
  color: #6e5660;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: #efe4e9;
  color: #3d2f36;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 22px 8px;
  overflow: hidden;
}

.dialog-body.is-day {
  padding-bottom: 4px;
}

.dialog-body.is-day .stats-row,
.dialog-body.is-month .stats-row {
  margin-bottom: 8px;
}

.dialog-body.is-day .analysis-panel,
.dialog-body.is-month .analysis-panel {
  margin-bottom: 8px;
  padding: 8px 12px;
}

.dialog-body.is-day .analysis-grid,
.dialog-body.is-month .analysis-grid {
  gap: 8px;
}

.dialog-body.is-day .analysis-card,
.dialog-body.is-month .analysis-card {
  padding: 8px 10px;
}

.dialog-body.is-day .analysis-note,
.dialog-body.is-month .analysis-note {
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1;
}

.stat-total {
  background: #fdf5f8;
  color: #a83858;
  font-weight: 600;
}

.type-free {
  background: #e8faf7;
  color: #2db5a8;
}

.type-paid {
  background: #fff0f2;
  color: #e85d6a;
}

.type-member {
  background: #f3ebff;
  color: #9333ea;
}

.analysis-panel {
  flex-shrink: 0;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid #f0e0e8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fffafb 0%, #fff 100%);
}

.analysis-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.analysis-title {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #a83858;
  color: #fff;
  font-size: 12px;
  font-weight: 650;
}

.analysis-desc {
  color: #6e5660;
  font-size: 13px;
  line-height: 1.5;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fdf5f8;
}

.analysis-label {
  color: #9a8790;
  font-size: 12px;
}

.analysis-value {
  color: #3d2f36;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-tip {
  color: #a83858;
  font-size: 12px;
  font-style: normal;
}

.analysis-note {
  margin: 10px 0 0;
  color: #8a7480;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .analysis-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .month-view {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(180px, 1.1fr) minmax(160px, 0.9fr);
  }

  .month-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    grid-auto-rows: auto;
  }
}

.month-view {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.9fr);
  gap: 12px;
  overflow: hidden;
}

.month-chart-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 6px;
  border: 1px solid #f0e0e8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fffafb 0%, #fff 100%);
  overflow: hidden;
}

.month-chart-head {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  margin-bottom: 2px;
}

.month-chart-title {
  color: #3d2f36;
  font-size: 13px;
  font-weight: 650;
}

.month-chart-hint {
  color: #9a8790;
  font-size: 12px;
}

.month-chart {
  flex: 1;
  width: 100%;
  min-height: 0;
  height: auto;
}

.month-cards-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.year-block {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.year-block + .year-block {
  margin-top: 0;
}

.year-head {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.year-title {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fdf5f8;
  color: #a83858;
  font-size: 12px;
  font-weight: 650;
}

.month-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}

.month-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid #f0e0e8;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(168, 56, 88, 0.04);
  transition:
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.month-card:hover {
  border-color: #e8b8c8;
  box-shadow: 0 8px 20px rgba(168, 56, 88, 0.1);
}

.month-banner {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%);
}

.month-label {
  color: #a83858;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.month-total-tag {
  flex-shrink: 0;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: #a83858;
  font-size: 11px;
  font-weight: 650;
  line-height: 22px;
}

.month-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 0;
  padding: 8px 10px 10px;
}

.share-track {
  display: flex;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #f6eef2;
}

.share-seg {
  display: block;
  height: 100%;
}

.share-seg.is-free {
  background: linear-gradient(90deg, #8fe0d2, #5ec9b8);
}

.share-seg.is-paid {
  background: linear-gradient(90deg, #ffb3c0, #ff8fa3);
}

.share-seg.is-member {
  background: linear-gradient(90deg, #d8b8ff, #c49bff);
}

.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.chip-free {
  background: #e8faf7;
  color: #2db5a8;
}

.chip-paid {
  background: #fff0f2;
  color: #e85d6a;
}

.chip-member {
  background: #f3ebff;
  color: #9333ea;
}

.day-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 2px;
}

.day-view :deep(.completion-calendar) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.day-view :deep(.cal-toolbar),
.day-view :deep(.cal-meta),
.day-view :deep(.cal-weekdays) {
  margin-bottom: 6px;
}

.day-view :deep(.cal-grid) {
  flex: 1;
  min-height: 0;
  grid-auto-rows: minmax(0, 1fr);
  gap: 4px;
}

.day-view :deep(.cal-cell) {
  min-height: 0;
  padding: 6px 3px 4px;
  gap: 3px;
}

.empty-text {
  margin: auto;
  padding: 48px 16px;
  color: #9a8790;
  font-size: 14px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 22px 14px;
  border-top: 1px solid #f0e8ec;
}

.btn-secondary,
.btn-cancel {
  height: 34px;
  padding: 0 18px;
  border: 1px solid #e5dbe1;
  border-radius: 8px;
  background: #fff;
  color: #6e5660;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover,
.btn-cancel:hover {
  border-color: #e07890;
  color: #a83858;
}
</style>
