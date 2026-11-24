import { displayCostChartCategory, formatCostAmount } from '@/composables/useCostData'
import {
  buildAuthorCompletionPieData,
  buildAuthorCompletionRateData,
  buildTypeCompletionRateData,
  buildCompletionChartData,
} from '@/composables/usePatternData'
import {
  chartBarGradientPairs,
  costMonthlyBarGradient,
  getChartBarGradientPair,
  getChartPieColor,
  typeRatioGradients,
} from '@/utils/chartColors'

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

const barGradientHorizontal = (start, end) => ({
  type: 'linear',
  x: 0,
  y: 0,
  x2: 1,
  y2: 0,
  colorStops: [
    { offset: 0, color: start },
    { offset: 1, color: end },
  ],
})

const emptyChartGraphic = (text) => ({
  type: 'text',
  left: 'center',
  top: 'middle',
  style: {
    text,
    fill: '#9a8a92',
    fontSize: 14,
  },
})

/** 花费图表横轴：合并「其他」后类别较少，全部水平展示 */
function costCategoryAxisLabel() {
  return {
    color: '#52404a',
    fontSize: 12,
    interval: 0,
    overflow: 'truncate',
    width: 56,
  }
}

function mapCostChartCategories(categories = []) {
  return categories.map(displayCostChartCategory)
}

function isCostBarClickable(value, category, { clickableAll = false, clickableCategory = '' } = {}) {
  if (!(Number(value) > 0)) return false
  if (clickableAll) return true
  return Boolean(clickableCategory && category === clickableCategory)
}

function buildCostBarSeriesData(amounts, categories, options = {}) {
  const { clickableAll = false, clickableCategory = '' } = options
  return amounts.map((value, index) => {
    const [top, bottom] = chartBarGradientPairs[index % chartBarGradientPairs.length]
    const category = categories[index]
    const clickable = isCostBarClickable(value, category, { clickableAll, clickableCategory })
    return {
      value,
      itemStyle: {
        color: barGradient(top, bottom),
        borderRadius: [8, 8, 0, 0],
        opacity: clickable ? 0.92 : 1,
      },
    }
  })
}

function costBarClickHint(clickableAll = false, clickableCategory = '') {
  if (clickableAll) return '点击查看详情'
  if (clickableCategory) return '点击查看细分'
  return ''
}

function costBarTooltipFormatter(params, options = {}, extraHint = '') {
  const { clickableAll = false, clickableCategory = '' } = options
  const item = params[0]
  const category = item?.axisValue || ''
  const lines = [`${category}<br/>${formatCostAmount(item.value)}`]
  const clickHint = costBarClickHint(clickableAll, clickableCategory)
  const rawCategory = clickableCategory
  const matchedClickable =
    clickableAll
    || (rawCategory && category === displayCostChartCategory(rawCategory))
  if (clickHint && matchedClickable && item.value > 0) {
    lines.push(`<span style="color:#9a8a92;font-size:11px">${clickHint}</span>`)
  } else if (extraHint && item.value > 0) {
    lines.push(`<span style="color:#9a8a92;font-size:11px">${extraHint}</span>`)
  }
  return lines.join('<br/>')
}

export function getCostMonthlyTrendChartOption(amounts, categories, emptyText) {
  const hasData = amounts.some((value) => value > 0)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => costBarTooltipFormatter(params, '', '点击查看明细'),
    },
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#52404a',
        fontSize: 11,
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#52404a' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        cursor: 'pointer',
        data: amounts.map((value) => ({
          value,
          itemStyle: {
            color: barGradient(costMonthlyBarGradient[0], costMonthlyBarGradient[1]),
            borderRadius: [8, 8, 0, 0],
            opacity: value > 0 ? 0.92 : 1,
          },
        })),
        label: {
          show: true,
          position: 'top',
          distance: 4,
          formatter: (params) => (params.value > 0 ? formatCostAmount(params.value) : ''),
          color: '#52404a',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  }
}

export function getCostDailyTrendChartOption(amounts, categories, emptyText) {
  const hasData = amounts.some((value) => value > 0)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  const lineColor = costMonthlyBarGradient[1]

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params) => {
        const item = params[0]
        const lines = [`${item?.axisValue || ''}<br/>${formatCostAmount(item?.value)}`]
        if (Number(item?.value) > 0) {
          lines.push('<span style="color:#9a8a92;font-size:11px">点击查看明细</span>')
        }
        return lines.join('<br/>')
      },
    },
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      axisLabel: {
        color: '#52404a',
        fontSize: 10,
        interval: categories.length > 16 ? 1 : 0,
      },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#52404a' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: true,
        cursor: 'pointer',
        lineStyle: {
          width: 2.5,
          color: lineColor,
        },
        itemStyle: {
          color: lineColor,
          borderColor: '#fff',
          borderWidth: 2,
        },
        areaStyle: {
          color: barGradient('rgba(58, 158, 176, 0.28)', 'rgba(58, 158, 176, 0.02)'),
        },
        data: amounts,
      },
    ],
  }
}

export function getCostBarChartOption(amounts, categories, emptyText, options = {}) {
  const { clickableAll = false, clickableCategory = '' } = options
  const hasData = amounts.some((value) => value > 0)
  const barsClickable = clickableAll || Boolean(clickableCategory)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => costBarTooltipFormatter(params, { clickableAll, clickableCategory }),
    },
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: mapCostChartCategories(categories),
      axisLabel: costCategoryAxisLabel(),
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#52404a' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 48,
        cursor: barsClickable ? 'pointer' : 'default',
        data: buildCostBarSeriesData(amounts, categories, { clickableAll, clickableCategory }),
        label: {
          show: true,
          position: 'top',
          distance: 4,
          formatter: (params) => (params.value > 0 ? formatCostAmount(params.value) : ''),
          color: '#52404a',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  }
}

export function getCostMonthCompareChartOption(amounts, compareAmounts, categories, emptyText, options = {}) {
  const { clickableAll = false, clickableCategory = '' } = options
  const hasData =
    amounts.some((value) => value > 0) || compareAmounts.some((value) => value > 0)
  const barsClickable = clickableAll || Boolean(clickableCategory)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      formatter: (params) => {
        const name = params[0]?.axisValue || ''
        const lines = [name]
        params.forEach((item) => {
          lines.push(`${item.marker}${item.seriesName}：${formatCostAmount(item.value)}`)
        })
        const barItem = params.find((item) => item.seriesType === 'bar') || params[0]
        const clickHint = costBarClickHint(clickableAll, clickableCategory)
        const matchedClickable =
          clickableAll
          || (clickableCategory && name === displayCostChartCategory(clickableCategory))
        if (clickHint && matchedClickable && Number(barItem?.value) > 0) {
          lines.push(`<span style="color:#9a8a92;font-size:11px">${clickHint}</span>`)
        }
        return lines.join('<br/>')
      },
    },
    legend: {
      data: ['本月', '上月'],
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { color: '#52404a', fontSize: 12 },
    },
    grid: {
      left: 48,
      right: 24,
      top: 36,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: mapCostChartCategories(categories),
      axisLabel: costCategoryAxisLabel(),
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#52404a' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        name: '本月',
        type: 'bar',
        barMaxWidth: 40,
        cursor: barsClickable ? 'pointer' : 'default',
        data: buildCostBarSeriesData(amounts, categories, { clickableAll, clickableCategory }),
        label: {
          show: true,
          position: 'top',
          distance: 4,
          formatter: (params) => (params.value > 0 ? formatCostAmount(params.value) : ''),
          color: '#52404a',
          fontSize: 11,
          fontWeight: 600,
        },
      },
      {
        name: '上月',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: {
          width: 2,
          color: '#9333ea',
        },
        itemStyle: {
          color: '#9333ea',
          borderColor: '#fff',
          borderWidth: 2,
        },
        data: compareAmounts,
      },
    ],
  }
}

export function getBarChartOption(list, { includeMemberType = true, showAuthorCompletionRate = false } = {}) {
  const { authors, freeData, memberData, paidData } = buildCompletionChartData(list, {
    includeMemberType,
  })
  const authorRateMap = showAuthorCompletionRate
    ? Object.fromEntries(buildAuthorCompletionRateData(list).map((item) => [item.name, item]))
    : null
  const hasData = includeMemberType
    ? freeData.some((n) => n > 0) || memberData.some((n) => n > 0) || paidData.some((n) => n > 0)
    : freeData.some((n) => n > 0) || paidData.some((n) => n > 0)

  if (!hasData) {
    return {
      graphic: emptyChartGraphic('暂无已完成图纸，请先在表格中将图纸标记为「已完成」'),
    }
  }

  const legendData = includeMemberType
    ? ['免费图纸', '会员图纸', '付费图纸']
    : ['免费图纸', '付费图纸']

  const TOP_RADIUS = [8, 8, 0, 0]
  const NO_RADIUS = [0, 0, 0, 0]

  /** 每根柱最上层非 0 段加圆角，保证顶角一致 */
  const buildStackedBarData = (values, isTopLayer) =>
    values.map((value, index) => {
      const hasUpper =
        (includeMemberType && !isTopLayer.member && memberData[index] > 0) ||
        (!isTopLayer.paid && paidData[index] > 0)
      const isTop = value > 0 && !hasUpper
      return {
        value,
        itemStyle: { borderRadius: isTop ? TOP_RADIUS : NO_RADIUS },
      }
    })

  const series = [
    {
      name: '免费图纸',
      type: 'bar',
      stack: 'total',
      cursor: 'pointer',
      barMaxWidth: 42,
      itemStyle: {
        color: barGradient('#b8f0e8', '#5ec9b8'),
      },
      emphasis: { itemStyle: { color: barGradient('#c8f5ee', '#4dbdaa') } },
      data: buildStackedBarData(freeData, { member: false, paid: false }),
    },
  ]

  if (includeMemberType) {
    series.push({
      name: '会员图纸',
      type: 'bar',
      stack: 'total',
      cursor: 'pointer',
      barMaxWidth: 42,
      itemStyle: {
        color: barGradient('#f0d4ff', '#c49bff'),
      },
      emphasis: { itemStyle: { color: barGradient('#f5e0ff', '#b388ff') } },
      data: buildStackedBarData(memberData, { member: true, paid: false }),
    })
  }

  series.push({
    name: '付费图纸',
    type: 'bar',
    stack: 'total',
    cursor: 'pointer',
    barMaxWidth: 42,
    itemStyle: {
      color: barGradient('#ffe0d4', '#ff8fa3'),
    },
    emphasis: { itemStyle: { color: barGradient('#ffe8de', '#ff7a92') } },
    data: buildStackedBarData(paidData, { member: true, paid: true }),
  })

  if (showAuthorCompletionRate) {
    const totalData = authors.map(
      (_, index) =>
        freeData[index] +
        (includeMemberType ? memberData[index] : 0) +
        paidData[index],
    )

    series.push({
      name: '__completion_rate__',
      type: 'bar',
      barGap: '-100%',
      barMaxWidth: 42,
      data: totalData,
      silent: true,
      legendHoverLink: false,
      itemStyle: { color: 'transparent' },
      emphasis: { disabled: true },
      label: {
        show: true,
        position: 'top',
        distance: 6,
        color: '#6e5660',
        fontSize: 11,
        fontWeight: 600,
        formatter: (params) => {
          const rateItem = authorRateMap?.[authors[params.dataIndex]]
          return rateItem ? `${rateItem.value}%` : ''
        },
      },
      z: 10,
    })
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...(showAuthorCompletionRate
        ? {
            formatter: (params) => {
              const author = params[0]?.axisValue
              const rateItem = authorRateMap?.[author]
              let html = `${author}<br/>`
              params
                .filter((item) => item.seriesName !== '__completion_rate__')
                .forEach((item) => {
                  html += `${item.marker}${item.seriesName}: ${item.value}<br/>`
                })
              if (rateItem) {
                html += `拼完占比: ${rateItem.value}%（${rateItem.completed}/${rateItem.total}）`
              }
              return html
            },
          }
        : {}),
    },
    legend: {
      data: legendData,
      top: 0,
      left: 'center',
      itemGap: 28,
      itemWidth: 14,
      itemHeight: 14,
      textStyle: { color: '#52404a', fontSize: 13 },
    },
    grid: {
      left: 56,
      right: 32,
      top: showAuthorCompletionRate ? 76 : 64,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: authors,
      axisLabel: { color: '#52404a', fontSize: 12 },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '完成次数',
      nameGap: 28,
      nameTextStyle: { color: '#6e5660', fontSize: 12, padding: [0, 0, 4, 0] },
      minInterval: 1,
      axisLabel: { color: '#52404a' },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series,
  }
}

export function getPieChartOption(list) {
  const data = buildAuthorCompletionPieData(list)

  if (!data.length) {
    return { graphic: emptyChartGraphic('暂无已完成图纸') }
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 次 ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      height: '72%',
      itemGap: 8,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#52404a', fontSize: 11 },
      pageButtonItemGap: 4,
      pageButtonGap: 6,
      pageIconSize: 10,
      pageIconColor: '#9a8a92',
      pageIconInactiveColor: '#d8cdd2',
      pageTextStyle: { color: '#6e5660', fontSize: 10 },
    },
    series: [
      {
        name: '完成次数',
        type: 'pie',
        radius: ['36%', '58%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 5,
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: getChartPieColor(item.name, index) },
        })),
      },
    ],
  }
}

export function getTypeRatioChartOption(list, { includeMemberType = true } = {}) {
  const data = buildTypeCompletionRateData(list, { includeMemberType })
  const hasData = data.some((item) => item.total > 0)

  if (!hasData) {
    return { graphic: emptyChartGraphic('暂无图纸数据') }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = data[params[0].dataIndex]
        return `${item.name}<br/>已完成 ${item.completed} / ${item.total}（${item.value}%）`
      },
    },
    grid: {
      left: 4,
      right: 28,
      top: 4,
      bottom: 4,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      min: 0,
      axisLabel: {
        color: '#52404a',
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      inverse: true,
      axisLabel: {
        color: '#52404a',
        fontSize: 12,
        width: 72,
        overflow: 'truncate',
        align: 'right',
      },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    series: [
      {
        name: '拼完占比',
        type: 'bar',
        data: data.map((item) => {
          const [start, end] = typeRatioGradients[item.key]
          return {
            value: item.total > 0 ? item.value : 0,
            itemStyle: {
              color: item.total > 0 ? barGradientHorizontal(start, end) : '#e8e0e4',
              borderRadius: [0, 6, 6, 0],
            },
          }
        }),
        barMaxWidth: 22,
        barMinHeight: 4,
        label: {
          show: true,
          formatter: (params) => {
            const item = data[params.dataIndex]
            return item.total > 0 ? `${item.value}%` : '无数据'
          },
          color: '#52404a',
          fontSize: 11,
          fontWeight: 600,
          position: 'right',
          align: 'left',
          distance: 6,
        },
      },
    ],
  }
}

export function getAuthorRatioChartOption(list) {
  const data = buildAuthorCompletionRateData(list)

  if (!data.length) {
    return { graphic: emptyChartGraphic('暂无作者数据') }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = data[params[0].dataIndex]
        return `${item.name}<br/>已完成 ${item.completed} / ${item.total}（${item.value}%）`
      },
    },
    grid: {
      left: 8,
      right: 8,
      top: 28,
      bottom: 4,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        color: '#52404a',
        fontSize: 11,
        overflow: 'truncate',
        width: 48,
      },
      axisLine: { lineStyle: { color: '#f0e4ea' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      min: 0,
      name: '拼完占比',
      nameTextStyle: { color: '#6e5660', fontSize: 11 },
      axisLabel: {
        color: '#52404a',
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: '#f5eef2', type: 'dashed' } },
    },
    series: [
      {
        name: '拼完占比',
        type: 'bar',
        cursor: 'pointer',
        data: data.map((item, index) => {
          const [top, bottom] = getChartBarGradientPair(item.name, index)
          return {
            value: item.value,
            itemStyle: {
              color: barGradient(top, bottom),
              borderRadius: [6, 6, 0, 0],
            },
          }
        }),
        barMaxWidth: 28,
        barMinHeight: 4,
        label: {
          show: true,
          formatter: '{c}%',
          color: '#52404a',
          fontSize: 11,
          fontWeight: 600,
          position: 'top',
          distance: 4,
        },
      },
    ],
  }
}
