<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div>
            <h4>作者每月图纸汇总</h4>
            <p class="header-sub">购买人：{{ buyer || '—' }}</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="chart-head">
            <div class="view-tabs" role="tablist" aria-label="图表视图">
              <button
                type="button"
                class="view-tab"
                :class="{ active: activeView === 'rank' }"
                @click="activeView = 'rank'"
              >
                每月 TOP
              </button>
              <button
                type="button"
                class="view-tab"
                :class="{ active: activeView === 'author' }"
                @click="activeView = 'author'"
              >
                作者排行
              </button>
            </div>
            <div class="chart-head-right">
              <div class="rank-legend" aria-label="图例">
                <span
                  v-for="item in activeLegend"
                  :key="item.key"
                  class="rank-legend-item"
                >
                  <i class="rank-legend-swatch" :style="{ background: item.color }" />
                  {{ item.label }}
                </span>
              </div>
              <div class="mini-stats">
                <span>作者 {{ chartData.authorCount }}</span>
                <span>{{ chartData.monthCount }} 个月</span>
                <span>共 {{ chartData.totalPatterns }} 张</span>
              </div>
            </div>
          </div>
          <div class="chart-wrap">
            <BaseEchart
              :option="chartOption"
              :chart-events="chartEvents"
              class="chart"
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-primary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>

  <AuthorCompletedPatternsDialog
    v-model:visible="detailVisible"
    :author="detailAuthor"
    :title="detailTitle"
    :patterns="detailPatterns"
    :show-buyer="false"
    :show-author="detailShowAuthor"
    show-amount
    list-hint="图纸"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseEchart from '@/components/charts/BaseEchart.vue'
import { usePatternData } from '@/composables/usePatternData'
import {
  AUTHOR_MONTHLY_RANK_METRICS,
  AUTHOR_TYPE_RANK_METRICS,
  buildAuthorMonthlyTypeChartData,
  filterPatternsByAuthor,
  filterPatternsByAuthorMonth,
  filterPatternsByMonth,
  getAuthorMonthlyTopRankChartOption,
  getAuthorTypeRankChartOption,
} from '@/view/author/utils/authorSummaryChartOptions'
import AuthorCompletedPatternsDialog from '@/view/statistics/components/AuthorCompletedPatternsDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  buyer: { type: String, default: '' },
  authors: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible'])

const { memberPatterns } = usePatternData()

const activeView = ref('rank')
const rankLegend = AUTHOR_MONTHLY_RANK_METRICS
const authorLegend = AUTHOR_TYPE_RANK_METRICS
const detailVisible = ref(false)
const detailAuthor = ref('')
const detailMonth = ref('')
const detailMonthLabel = ref('')
const detailMode = ref('month') // month | author | authorAll

const activeLegend = computed(() =>
  activeView.value === 'rank' ? rankLegend : authorLegend,
)

const authorNameList = computed(() => (props.authors || []).map((item) => item.name))

const chartData = computed(() =>
  buildAuthorMonthlyTypeChartData(memberPatterns.value, {
    buyer: props.buyer,
    authors: authorNameList.value,
  }),
)

const chartOption = computed(() =>
  activeView.value === 'rank'
    ? getAuthorMonthlyTopRankChartOption(chartData.value)
    : getAuthorTypeRankChartOption(chartData.value),
)

const detailShowAuthor = computed(() => detailMode.value === 'month')

const detailPatterns = computed(() => {
  if (detailMode.value === 'authorAll') {
    return filterPatternsByAuthor(memberPatterns.value, {
      author: detailAuthor.value,
      buyer: props.buyer,
    })
  }
  if (detailMode.value === 'author') {
    return filterPatternsByAuthorMonth(memberPatterns.value, {
      author: detailAuthor.value,
      month: detailMonth.value,
      buyer: props.buyer,
    })
  }
  return filterPatternsByMonth(memberPatterns.value, {
    month: detailMonth.value,
    buyer: props.buyer,
    authors: authorNameList.value,
  })
})

const detailTitle = computed(() => {
  if (detailMode.value === 'authorAll' && detailAuthor.value) {
    return `${detailAuthor.value} · 全部图纸`
  }
  if (!detailMonthLabel.value) return '图纸明细'
  if (detailMode.value === 'author' && detailAuthor.value) {
    return `${detailAuthor.value} · ${detailMonthLabel.value}`
  }
  return `${detailMonthLabel.value} · 全部图纸`
})

const openMonthDetail = (monthIndex) => {
  const months = chartData.value.months || []
  const monthLabels = chartData.value.monthLabels || []
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex >= months.length) return

  detailMode.value = 'month'
  detailAuthor.value = ''
  detailMonth.value = months[monthIndex]
  detailMonthLabel.value = monthLabels[monthIndex] || months[monthIndex]
  detailVisible.value = true
}

const openAuthorAllDetail = (authorName) => {
  const author = String(authorName || '').trim()
  if (!author) return
  detailMode.value = 'authorAll'
  detailAuthor.value = author
  detailMonth.value = ''
  detailMonthLabel.value = ''
  detailVisible.value = true
}

const handleChartClick = (params) => {
  if (params?.componentType !== 'series') return
  if (params.seriesType !== 'bar') return

  if (params?.data?.view === 'author-rank') {
    if (!(Number(params?.data?.total) > 0)) return
    openAuthorAllDetail(params?.data?.author || params?.name)
    return
  }

  const monthIndex = Number(params?.data?.monthIndex)
  if (!(Number(params?.data?.value) > 0)) return
  openMonthDetail(monthIndex)
}

const chartEvents = { click: handleChartClick }

const handleClose = () => {
  emit('update:visible', false)
}

let previousBodyOverflow = ''

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      lockBodyScroll()
      return
    }
    unlockBodyScroll()
    detailVisible.value = false
    detailAuthor.value = ''
    detailMonth.value = ''
    detailMonthLabel.value = ''
    detailMode.value = 'month'
    activeView.value = 'rank'
  },
)

onBeforeUnmount(() => {
  unlockBodyScroll()
})
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  background: rgba(36, 24, 32, 0.5);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(1560px, 98vw);
  height: min(94vh, 980px);
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(82, 64, 74, 0.2);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px 12px;
  border-bottom: 1px solid #e8efe4;
}

.dialog-header h4 {
  margin: 0;
  color: #3d4a38;
  font-size: 17px;
  font-weight: 650;
}

.header-sub {
  margin: 4px 0 0;
  color: #9a8790;
  font-size: 12px;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #eef3ea;
  color: #5a6b56;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: #e0ead8;
  color: #3d4a38;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 22px;
  overflow: hidden;
}

.chart-head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.chart-head-right {
  margin-left: auto;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.rank-legend {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 14px;
}

.rank-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5a6b56;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.rank-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.view-tabs {
  display: inline-flex;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 10px;
  background: #eef3ea;
}

.view-tab {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6d7a68;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.view-tab.active {
  background: #fff;
  color: #3d4a38;
  box-shadow: 0 1px 4px rgba(61, 74, 56, 0.1);
}

.mini-stats {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
}

.mini-stats span {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef6e8;
  color: #4a7a42;
  font-size: 12px;
  font-weight: 600;
}

.chart-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
  background: transparent;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 10px 22px 14px;
  border-top: 1px solid #e8efe4;
}

.btn-primary {
  height: 34px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #a8d99a, #7bc46a);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:hover {
  filter: brightness(0.98);
}
</style>
