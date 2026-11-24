import { formatCostAmount } from '@/composables/useCostData'

const emptyGraphic = (text) => ({
  type: 'text',
  left: 'center',
  top: 'middle',
  style: {
    text,
    fill: '#b8a8b0',
    fontSize: 14,
  },
})

const barGradientVertical = (top, bottom) => ({
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

const COLORS = {
  countBarSoft: '#ffd8e2',
  countBar: '#e07890',
  amountLine: '#7eb8e0',
  amountArea: 'rgba(126, 184, 224, 0.14)',
  dateBarSoft: '#d8b8ff',
  dateBar: '#c49bff',
  dateLine: '#a83858',
  axis: '#8a7480',
  axisLine: '#f0e4ea',
  split: '#f5eef2',
  text: '#52404a',
}

function dualAxisTooltipFormatter(params, { countName = '购买次数', amountName = '金额' } = {}) {
  const list = Array.isArray(params) ? params : [params]
  const title = list[0]?.axisValueLabel || list[0]?.axisValue || list[0]?.name || ''
  const lines = list.map((item) => {
    const isAmount = item.seriesName === amountName
    const value = isAmount
      ? formatCostAmount(item.value)
      : `${item.value} 次`
    return `${item.marker}${item.seriesName}：${value}`
  })
  return [`<b>${title}</b>`, ...lines].join('<br/>')
}

/**
 * 品牌维度：柱=购买次数，折线=金额
 */
export function getBrandComboChartOption({ categories = [], counts = [], amounts = [] } = {}) {
  if (!categories.length || (!counts.some((v) => v > 0) && !amounts.some((v) => v > 0))) {
    return { graphic: emptyGraphic('暂无品牌购买数据') }
  }

  const showZoom = categories.length > 10

  return {
    color: [COLORS.countBar, COLORS.amountLine],
    legend: {
      top: 4,
      left: 'center',
      itemWidth: 12,
      itemHeight: 10,
      itemGap: 20,
      textStyle: { color: COLORS.text, fontSize: 12 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#d8c4cc' } },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#efe4e9',
      borderWidth: 1,
      textStyle: { color: COLORS.text, fontSize: 12 },
      formatter: (params) => dualAxisTooltipFormatter(params),
    },
    grid: {
      left: 12,
      right: 16,
      top: 44,
      bottom: 28,
      containLabel: true,
    },
    dataZoom: showZoom
      ? [
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
            start: 0,
            end: Math.min(100, Math.round((10 / categories.length) * 100)),
          },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: COLORS.axis,
        fontSize: 11,
        interval: 0,
        rotate: 0,
        hideOverlap: true,
        width: 72,
        overflow: 'truncate',
      },
      axisLine: { lineStyle: { color: COLORS.axisLine } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        nameTextStyle: { color: COLORS.axis, fontSize: 11, padding: [0, 28, 0, 0] },
        minInterval: 1,
        axisLabel: { color: COLORS.axis, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.split, type: 'dashed' } },
      },
      {
        type: 'value',
        name: '金额',
        nameTextStyle: { color: COLORS.axis, fontSize: 11, padding: [0, 0, 0, 28] },
        axisLabel: {
          color: COLORS.axis,
          fontSize: 11,
          formatter: (value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
            return String(value)
          },
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '购买次数',
        type: 'bar',
        barMaxWidth: 28,
        barCategoryGap: '42%',
        data: counts.map((value) => ({
          value,
          itemStyle: {
            color: barGradientVertical(COLORS.countBarSoft, COLORS.countBar),
            borderRadius: [8, 8, 0, 0],
          },
        })),
        emphasis: { focus: 'series' },
      },
      {
        name: '金额',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.28,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: categories.length <= 16,
        data: amounts,
        lineStyle: { width: 2.6, color: COLORS.amountLine },
        itemStyle: {
          color: COLORS.amountLine,
          borderColor: '#fff',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(126, 184, 224, 0.22)' },
              { offset: 1, color: 'rgba(126, 184, 224, 0.02)' },
            ],
          },
        },
        z: 5,
      },
    ],
  }
}

const GANTT_COUNT_COLORS = {
  none: '#f6f2fa',
  one: '#c4a0e8',
  few: '#b088de',
  mid: '#9a70d2',
  many: '#8458c4',
  max: '#6e42b0',
}

function countToGanttColor(count = 0) {
  const n = Number(count) || 0
  if (n <= 0) return GANTT_COUNT_COLORS.none
  if (n === 1) return GANTT_COUNT_COLORS.one
  if (n <= 3) return GANTT_COUNT_COLORS.few
  if (n <= 6) return GANTT_COUNT_COLORS.mid
  if (n <= 10) return GANTT_COUNT_COLORS.many
  return GANTT_COUNT_COLORS.max
}

/**
 * 把某品牌连续有购买的月份合并成甘特区间
 * 返回 [brandIndex, startMonth, endMonthExclusive, count, amount]
 */
function buildBrandMonthGanttSegments(rows = [], monthCount = 0) {
  const segments = []
  rows.forEach((row, brandIndex) => {
    const cells = row.cells || []
    let start = -1
    let sumCount = 0
    let sumAmount = 0

    const flush = (endExclusive) => {
      if (start < 0) return
      segments.push({
        value: [brandIndex, start, endExclusive, sumCount, sumAmount],
        itemStyle: { color: countToGanttColor(sumCount) },
      })
      start = -1
      sumCount = 0
      sumAmount = 0
    }

    for (let i = 0; i < monthCount; i += 1) {
      const count = Number(cells[i]?.count) || 0
      const amount = Number(cells[i]?.amount) || 0
      if (count > 0) {
        if (start < 0) start = i
        sumCount += count
        sumAmount += amount
      } else {
        flush(i)
      }
    }
    flush(monthCount)
  })
  return segments
}

/**
 * 品牌 × 月份甘特图：横轴月份时间线，纵轴品牌（会回购在前）
 */
export function getBrandMonthGanttChartOption(matrix = {}) {
  const {
    monthLabels = [],
    brands = [],
    rows = [],
  } = matrix

  if (!monthLabels.length || !brands.length) {
    return { graphic: emptyGraphic('暂无品牌购买月份数据') }
  }

  const segments = buildBrandMonthGanttSegments(rows, monthLabels.length)
  const showYZoom = brands.length > 12
  const initialYEnd = showYZoom ? Math.min(100, Math.round((12 / brands.length) * 100)) : 100

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#efe4e9',
      borderWidth: 1,
      textStyle: { color: COLORS.text, fontSize: 12 },
      formatter: (params) => {
        const value = params?.value || []
        const brand = brands[value[0]] || ''
        const start = Number(value[1]) || 0
        const endExclusive = Number(value[2]) || start + 1
        const count = Number(value[3]) || 0
        const amount = Number(value[4]) || 0
        const startLabel = monthLabels[start] || ''
        const endLabel = monthLabels[Math.max(endExclusive - 1, start)] || startLabel
        const rangeText = startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`
        return [
          `<b>${brand}</b>`,
          rangeText,
          `购买 ${count} 次 · ${formatCostAmount(amount)}`,
        ].join('<br/>')
      },
    },
    grid: {
      left: 8,
      right: 16,
      top: 28,
      bottom: 36,
      containLabel: true,
    },
    dataZoom: showYZoom
      ? [
          {
            type: 'inside',
            yAxisIndex: 0,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
            start: 0,
            end: initialYEnd,
          },
        ]
      : undefined,
    xAxis: {
      type: 'value',
      min: 0,
      max: monthLabels.length,
      interval: 1,
      splitNumber: monthLabels.length,
      axisLabel: {
        color: COLORS.axis,
        fontSize: 11,
        showMinLabel: true,
        showMaxLabel: false,
        formatter: (value) => {
          const index = Math.round(Number(value))
          if (index < 0 || index >= monthLabels.length) return ''
          return monthLabels[index]
        },
      },
      splitLine: { lineStyle: { color: COLORS.split, type: 'dashed' } },
      axisLine: { lineStyle: { color: COLORS.axisLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: brands,
      inverse: true,
      axisLabel: {
        color: COLORS.text,
        fontSize: 12,
        interval: 0,
        width: 92,
        overflow: 'truncate',
        margin: 10,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: { color: '#f7f0f3' },
      },
    },
    visualMap: {
      show: true,
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      bottom: 2,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 14,
      textStyle: { color: COLORS.axis, fontSize: 11 },
      pieces: [
        { min: 1, max: 1, label: '1次', color: GANTT_COUNT_COLORS.one },
        { min: 2, max: 3, label: '2–3', color: GANTT_COUNT_COLORS.few },
        { min: 4, max: 6, label: '4–6', color: GANTT_COUNT_COLORS.mid },
        { min: 7, max: 10, label: '7–10', color: GANTT_COUNT_COLORS.many },
        { min: 11, label: '11+', color: GANTT_COUNT_COLORS.max },
      ],
      dimension: 3,
      seriesIndex: 0,
    },
    series: [
      {
        type: 'custom',
        name: '购买区间',
        clip: true,
        renderItem: (params, api) => {
          const categoryIndex = api.value(0)
          const start = api.coord([api.value(1), categoryIndex])
          const end = api.coord([api.value(2), categoryIndex])
          const height = Math.max(api.size([0, 1])[1] * 0.55, 12)
          const width = Math.max(end[0] - start[0] - 4, 8)
          const x = start[0] + 2
          const y = start[1] - height / 2
          const count = Number(api.value(3)) || 0

          return {
            type: 'group',
            children: [
              {
                type: 'rect',
                shape: {
                  x,
                  y,
                  width,
                  height,
                  r: 6,
                },
                style: {
                  ...api.style(),
                  fill: countToGanttColor(count),
                  cursor: 'pointer',
                },
              },
              {
                type: 'text',
                silent: true,
                style: {
                  x: x + width / 2,
                  y: y + height / 2,
                  text: count > 0 ? String(count) : '',
                  fill: '#ffffff',
                  font: '650 11px sans-serif',
                  align: 'center',
                  verticalAlign: 'middle',
                },
              },
            ],
          }
        },
        encode: {
          x: [1, 2],
          y: 0,
          tooltip: [0, 1, 2, 3, 4],
        },
        data: segments,
      },
    ],
  }
}
