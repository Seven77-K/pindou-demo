import { formatCostAmount } from '@/composables/useCostData'
import { chartPieColors } from '@/utils/chartColors'

const barGradient = (top, bottom) => ({
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: top },
    { offset: 1, color: bottom },
  ],
})

const emptyGraphic = (text) => ({
  type: 'text',
  left: 'center',
  top: 'middle',
  style: {
    text,
    fill: '#9a8a92',
    fontSize: 14,
  },
})

// 豆沙粉 / 雾紫，贴合后台粉紫主色
const DONE_TOP = '#ffd8e2'
const DONE_BOTTOM = '#e891a8'
const PENDING_TOP = '#e8dff8'
const PENDING_BOTTOM = '#b8a4d8'

function buildHomeDualBarOption({ categories, completedData, pendingData, emptyText }) {
  const hasData =
    completedData.some((value) => value > 0) || pendingData.some((value) => value > 0)

  if (!hasData || !categories.length) {
    return { graphic: emptyGraphic(emptyText) }
  }

  const manyCategories = categories.length > 8

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const lines = [`${params[0]?.axisValue || ''}`]
        params.forEach((item) => {
          lines.push(`${item.marker}${item.seriesName}：${item.value}`)
        })
        return lines.join('<br/>')
      },
    },
    legend: {
      data: ['已完成', '未完成'],
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#52404a', fontSize: 12 },
    },
    color: [DONE_BOTTOM, PENDING_BOTTOM],
    grid: {
      left: 44,
      right: 16,
      top: 40,
      bottom: 28,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#52404a',
        fontSize: manyCategories ? 11 : 12,
        interval: 0,
        rotate: 0,
      },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8a7a82' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        name: '已完成',
        type: 'bar',
        barGap: '20%',
        barMaxWidth: manyCategories ? 22 : 40,
        itemStyle: {
          color: barGradient(DONE_TOP, DONE_BOTTOM),
          borderRadius: [8, 8, 0, 0],
        },
        data: completedData,
      },
      {
        name: '未完成',
        type: 'bar',
        barMaxWidth: manyCategories ? 22 : 40,
        itemStyle: {
          color: barGradient(PENDING_TOP, PENDING_BOTTOM),
          borderRadius: [8, 8, 0, 0],
        },
        data: pendingData,
      },
    ],
  }
}

/** 本月：会员图纸 / 普通图纸 · 已完成+未完成双柱 */
export function getHomePatternCountChartOption({
  memberCompletedCount,
  normalCompletedCount,
  memberPendingCount,
  normalPendingCount,
}) {
  return buildHomeDualBarOption({
    categories: ['会员图纸', '普通图纸'],
    completedData: [memberCompletedCount, normalCompletedCount],
    pendingData: [memberPendingCount, normalPendingCount],
    emptyText: '暂无图纸数据',
  })
}

/** 所有：按月 · 已完成+未完成双柱 */
export function getHomeMonthlyPatternCountChartOption({
  categories = [],
  completed = [],
  pending = [],
} = {}) {
  return buildHomeDualBarOption({
    categories,
    completedData: completed,
    pendingData: pending,
    emptyText: '暂无月度图纸数据',
  })
}

export function getHomeCostPieChartOption(costByCategory) {
  const data = costByCategory

  if (!data.length) {
    return { graphic: emptyGraphic('暂无花费数据') }
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) =>
        `${name}<br/>${formatCostAmount(value)}（${percent}%）`,
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 8,
      top: 'middle',
      itemGap: 16,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#52404a', fontSize: 14 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['34%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scaleSize: 6,
          focus: 'self',
          label: { show: false },
          labelLine: { show: false },
        },
        blur: {
          itemStyle: { opacity: 0.85 },
          label: { show: false },
          labelLine: { show: false },
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: chartPieColors[index % chartPieColors.length] },
        })),
      },
    ],
  }
}
