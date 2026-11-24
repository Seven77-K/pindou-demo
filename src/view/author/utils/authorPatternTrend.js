const TYPE_KEYS = ['free', 'paid', 'member']

/** 与类型占比饼图一致，保证全站统一 */
const TREND_COLORS = {
  free: { solid: '#5ec9b8', soft: '#b8f0e8' },
  paid: { solid: '#ff8fa3', soft: '#ffe0d4' },
  member: { solid: '#c49bff', soft: '#f0d4ff' },
  total: '#a83858',
}

const TYPE_META = {
  free: { label: '免费', color: TREND_COLORS.free.solid },
  paid: { label: '付费', color: TREND_COLORS.paid.solid },
  member: { label: '会员', color: TREND_COLORS.member.solid },
}

const TOTAL_LINE_COLOR = TREND_COLORS.total

function emptyBucket() {
  return { total: 0, free: 0, paid: 0, member: 0 }
}

function resolveTypeKey(type) {
  if (type === 'paid') return 'paid'
  if (type === 'member') return 'member'
  return 'free'
}

function parsePatternDate(value) {
  const text = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text
}

function filterAuthorPatterns(patterns = [], author = '', buyer = '') {
  const authorName = String(author || '').trim()
  const buyerKeyword = String(buyer || '').trim()
  if (!authorName) return []
  return patterns.filter((item) => {
    if (String(item.author || '').trim() !== authorName) return false
    if (buyerKeyword && String(item.buyer || '').trim() !== buyerKeyword) return false
    return Boolean(parsePatternDate(item.date))
  })
}

function bucketsToSeries(orderedKeys, bucketMap) {
  const totals = []
  const free = []
  const paid = []
  const member = []
  orderedKeys.forEach((key) => {
    const row = bucketMap.get(key) || emptyBucket()
    totals.push(row.total)
    free.push(row.free)
    paid.push(row.paid)
    member.push(row.member)
  })
  return { keys: orderedKeys, totals, free, paid, member }
}

/** 某作者按月统计（图纸日期） */
export function buildAuthorPatternMonthlyTrend(patterns = [], author = '', { buyer = '' } = {}) {
  const list = filterAuthorPatterns(patterns, author, buyer)
  const map = new Map()

  list.forEach((item) => {
    const date = parsePatternDate(item.date)
    if (!date) return
    const month = date.slice(0, 7)
    if (!map.has(month)) map.set(month, emptyBucket())
    const row = map.get(month)
    row.total += 1
    row[resolveTypeKey(item.type)] += 1
  })

  const months = [...map.keys()].sort((a, b) => a.localeCompare(b))
  const series = bucketsToSeries(months, map)
  return {
    ...series,
    categories: months,
    labels: months.map((month) => {
      const [year, m] = month.split('-')
      return `${year.slice(2)}/${m}`
    }),
  }
}

/** 某作者某月按日统计（含无数据的日期，便于横轴全日展示） */
export function buildAuthorPatternDailyTrend(
  patterns = [],
  author = '',
  yearMonth = '',
  { buyer = '' } = {},
) {
  const monthKey = String(yearMonth || '').trim()
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return { keys: [], categories: [], labels: [], totals: [], free: [], paid: [], member: [] }
  }

  const [year, month] = monthKey.split('-').map(Number)
  const dayCount = new Date(year, month, 0).getDate()
  const map = new Map()
  for (let day = 1; day <= dayCount; day += 1) {
    map.set(String(day).padStart(2, '0'), emptyBucket())
  }

  filterAuthorPatterns(patterns, author, buyer)
    .filter((item) => String(item.date || '').startsWith(monthKey))
    .forEach((item) => {
      const date = parsePatternDate(item.date)
      if (!date) return
      const day = date.slice(8, 10)
      if (!map.has(day)) return
      const row = map.get(day)
      row.total += 1
      row[resolveTypeKey(item.type)] += 1
    })

  const days = [...map.keys()]
  const series = bucketsToSeries(days, map)
  return {
    ...series,
    categories: days,
    labels: days.map((day) => String(Number(day))),
  }
}

/** 月份卡片列表（日历视图用） */
export function buildAuthorPatternMonthCards(patterns = [], author = '', { buyer = '' } = {}) {
  const trend = buildAuthorPatternMonthlyTrend(patterns, author, { buyer })
  return (trend.keys || []).map((month, index) => {
    const [year, m] = month.split('-')
    return {
      key: month,
      year,
      month: Number(m),
      title: `${year}年${Number(m)}月`,
      shortTitle: `${Number(m)}月`,
      total: trend.totals[index] || 0,
      free: trend.free[index] || 0,
      paid: trend.paid[index] || 0,
      member: trend.member[index] || 0,
    }
  })
}

function pickDominantType(summary) {
  const entries = [
    { key: 'free', label: '免费', value: summary.free || 0 },
    { key: 'paid', label: '付费', value: summary.paid || 0 },
    { key: 'member', label: '会员', value: summary.member || 0 },
  ].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-CN'))
  const top = entries[0]
  if (!top || top.value <= 0) return null
  const total = entries.reduce((sum, item) => sum + item.value, 0)
  return {
    ...top,
    ratio: total > 0 ? Math.round((top.value / total) * 100) : 0,
  }
}

/** 全量月份分析文案 */
export function buildAuthorMonthAnalysis(cards = []) {
  const list = (cards || []).filter((card) => card.total > 0)
  if (!list.length) return null

  const summary = list.reduce(
    (acc, card) => {
      acc.total += card.total
      acc.free += card.free
      acc.paid += card.paid
      acc.member += card.member
      return acc
    },
    { total: 0, free: 0, paid: 0, member: 0 },
  )

  const peak = [...list].sort((a, b) => b.total - a.total || b.key.localeCompare(a.key))[0]
  const avg = Math.round((summary.total / list.length) * 10) / 10
  const dominant = pickDominantType(summary)

  const chron = [...list].sort((a, b) => a.key.localeCompare(b.key))
  let trendText = '各月产量较平稳'
  if (chron.length >= 2) {
    const recent = chron.slice(-3)
    const earlier = chron.slice(0, Math.max(chron.length - 3, 1))
    const recentAvg = recent.reduce((s, c) => s + c.total, 0) / recent.length
    const earlierAvg = earlier.reduce((s, c) => s + c.total, 0) / earlier.length
    if (recentAvg > earlierAvg * 1.15) trendText = '近几月产量偏高，作图节奏加快'
    else if (recentAvg < earlierAvg * 0.85) trendText = '近几月产量偏低，作图节奏放缓'
  }

  const items = [
    {
      key: 'peak',
      label: '高峰月',
      value: `${peak.title}`,
      tip: `${peak.total} 张`,
    },
    {
      key: 'avg',
      label: '月均',
      value: `${avg} 张`,
      tip: `共 ${list.length} 个月`,
    },
    {
      key: 'type',
      label: '主类型',
      value: dominant ? dominant.label : '—',
      tip: dominant ? `占比 ${dominant.ratio}%` : '',
    },
    {
      key: 'months',
      label: '共计',
      value: `${list.length} 个月`,
      tip: `共 ${summary.total} 张`,
    },
  ]

  return {
    items,
    sentences: [
      `共记录 ${summary.total} 张图纸，覆盖 ${list.length} 个月。`,
      `高峰在 ${peak.title}（${peak.total} 张）。`,
      dominant
        ? `类型以${dominant.label}为主（${dominant.value} 张，${dominant.ratio}%）。`
        : '',
      `${trendText}。`,
    ].filter(Boolean),
  }
}

/** 单月每日分析文案 */
export function buildAuthorDayAnalysis(dailyData = {}, yearMonth = '') {
  const totals = dailyData.totals || []
  const labels = dailyData.labels || []
  if (!totals.some((n) => n > 0)) return null

  const summary = {
    total: totals.reduce((s, n) => s + (Number(n) || 0), 0),
    free: (dailyData.free || []).reduce((s, n) => s + (Number(n) || 0), 0),
    paid: (dailyData.paid || []).reduce((s, n) => s + (Number(n) || 0), 0),
    member: (dailyData.member || []).reduce((s, n) => s + (Number(n) || 0), 0),
  }

  let peakIndex = 0
  totals.forEach((value, index) => {
    if (value > totals[peakIndex]) peakIndex = index
  })
  const activeDays = totals.filter((n) => n > 0).length
  const dayCount = totals.length || 1
  const avgActive = activeDays ? Math.round((summary.total / activeDays) * 10) / 10 : 0
  const dominant = pickDominantType(summary)
  const monthTitle = formatAuthorTrendMonthTitle(yearMonth)

  return {
    items: [
      {
        key: 'peak',
        label: '高峰日',
        value: `${labels[peakIndex] || peakIndex + 1}日`,
        tip: `${totals[peakIndex] || 0} 张`,
      },
      {
        key: 'active',
        label: '作图天',
        value: `${activeDays} 天`,
        tip: `占全月 ${Math.round((activeDays / dayCount) * 100)}%`,
      },
      {
        key: 'avg',
        label: '活跃日均',
        value: `${avgActive} 张`,
        tip: `全月 ${summary.total} 张`,
      },
      {
        key: 'type',
        label: '主类型',
        value: dominant ? dominant.label : '—',
        tip: dominant ? `占比 ${dominant.ratio}%` : '',
      },
    ],
    sentences: [
      `${monthTitle}共 ${summary.total} 张，有 ${activeDays} 天在出图。`,
      `最忙是 ${labels[peakIndex] || peakIndex + 1}日（${totals[peakIndex] || 0} 张）。`,
      dominant
        ? `当月以${dominant.label}为主（${dominant.value} 张，${dominant.ratio}%）。`
        : '',
    ].filter(Boolean),
  }
}

function emptyChartGraphic(text) {
  return {
    type: 'text',
    left: 'center',
    top: 'middle',
    style: {
      text,
      fill: '#9a8a92',
      fontSize: 14,
    },
  }
}

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

/**
 * 柱状图（免费/付费/会员堆叠）+ 折线（合计）
 * @param {{ scrollable?: boolean, visibleCount?: number, tipHint?: string, showLegend?: boolean, labelRotate?: number }} [options]
 */
export function getAuthorPatternTrendChartOption(
  data,
  {
    emptyText = '暂无数据',
    clickable = false,
    tipHint = '',
    scrollable = false,
    visibleCount = 12,
    showLegend = true,
    labelRotate = 0,
  } = {},
) {
  const categories = data?.labels || []
  const hasData = (data?.totals || []).some((value) => value > 0)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  const resolvedTipHint =
    tipHint ||
    (clickable
      ? '<br/><span style="color:#9a8a92;font-size:11px">点击查看每日明细</span>'
      : '')

  const needZoom = scrollable && categories.length > visibleCount
  const zoomWindow = needZoom
    ? Math.min(100, Math.round((visibleCount / categories.length) * 100))
    : 100
  const zoomStart = needZoom ? Math.max(0, 100 - zoomWindow) : 0

  return {
    color: [TYPE_META.free.color, TYPE_META.paid.color, TYPE_META.member.color, TOTAL_LINE_COLOR],
    legend: showLegend
      ? {
          top: 4,
          left: 'center',
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 18,
          icon: 'roundRect',
          textStyle: { color: '#6e5660', fontSize: 12 },
        }
      : { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#efe4e9',
      borderWidth: 1,
      textStyle: { color: '#52404a', fontSize: 12 },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params]
        const dayLabel = list[0]?.axisValue || ''
        const title = /^\d+$/.test(String(dayLabel)) ? `${dayLabel}日` : dayLabel
        const lines = list.map((item) => `${item.marker}${item.seriesName}：${item.value} 张`)
        return [`<b>${title}</b>`, ...lines].join('<br/>') + resolvedTipHint
      },
    },
    grid: {
      left: 8,
      right: 12,
      top: showLegend ? 40 : 16,
      bottom: needZoom ? 28 : 8,
      containLabel: true,
    },
    dataZoom: needZoom
      ? [
          {
            type: 'slider',
            xAxisIndex: 0,
            height: 16,
            bottom: 4,
            borderColor: '#efe4e9',
            backgroundColor: '#faf5f7',
            fillerColor: 'rgba(232, 145, 168, 0.18)',
            handleStyle: { color: '#e891a8' },
            moveHandleStyle: { color: '#e891a8' },
            textStyle: { color: '#9a8a92', fontSize: 10 },
            start: zoomStart,
            end: 100,
            brushSelect: false,
          },
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            // 关闭拖拽平移，避免与外层左右滑动切换冲突；可用底部滑条 / 滚轮平移
            zoomOnMouseWheel: false,
            moveOnMouseMove: false,
            moveOnMouseWheel: true,
            start: zoomStart,
            end: 100,
          },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: '#7a6670',
        fontSize: 11,
        interval: 0,
        rotate: labelRotate,
        hideOverlap: Boolean(scrollable),
        margin: 12,
      },
      axisLine: { lineStyle: { color: '#ebe0e6' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#7a6670', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3ecef', type: 'dashed' } },
    },
    series: [
      ...TYPE_KEYS.map((key, index) => {
        const colors = TREND_COLORS[key]
        const isLastBar = index === TYPE_KEYS.length - 1
        return {
          name: TYPE_META[key].label,
          type: 'bar',
          stack: 'type',
          barMaxWidth: scrollable ? 22 : 26,
          barCategoryGap: '28%',
          cursor: clickable ? 'pointer' : 'default',
          emphasis: { focus: 'series' },
          data: (data[key] || []).map((value) => ({
            value,
            itemStyle: {
              color: barGradient(colors.soft, colors.solid),
              borderRadius: isLastBar && value > 0 ? [6, 6, 0, 0] : 0,
              borderColor: '#fff',
              borderWidth: value > 0 ? 1 : 0,
            },
          })),
        }
      }),
      {
        name: '合计',
        type: 'line',
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: scrollable ? 5 : 7,
        showSymbol: !scrollable,
        cursor: clickable ? 'pointer' : 'default',
        data: data.totals || [],
        lineStyle: { width: 2.2, color: TOTAL_LINE_COLOR },
        itemStyle: {
          color: TOTAL_LINE_COLOR,
          borderColor: '#fff',
          borderWidth: 2,
        },
        z: 5,
      },
    ],
  }
}

export function formatAuthorTrendMonthTitle(yearMonth = '') {
  const text = String(yearMonth || '').trim()
  if (!/^\d{4}-\d{2}$/.test(text)) return text
  const [year, month] = text.split('-')
  return `${year}年${Number(month)}月`
}

export { TYPE_META, TREND_COLORS }
