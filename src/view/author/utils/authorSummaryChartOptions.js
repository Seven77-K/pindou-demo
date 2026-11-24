import { TYPE_META } from '@/view/author/utils/authorPatternTrend'

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

const AXIS = {
  text: '#3d4a38',
  axis: '#6d7a68',
  line: '#e4ebe0',
  split: '#eef3ea',
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

function formatMonthLabel(month) {
  const [year, m] = String(month || '').split('-')
  if (!year || !m) return String(month || '')
  return `${year.slice(2)}/${m}`
}

function emptyCell() {
  return { free: 0, paid: 0, member: 0, total: 0 }
}

/**
 * 作者 × 月份矩阵：每个格子是该作者当月免费/付费/会员张数
 * @param {Array} patterns 会员图纸列表
 * @param {{ buyer?: string, authors?: string[] }} options
 */
export function buildAuthorMonthlyTypeChartData(patterns = [], options = {}) {
  const buyer = String(options.buyer || '').trim()
  const authorSet = Array.isArray(options.authors) && options.authors.length
    ? new Set(options.authors.map((name) => String(name || '').trim()).filter(Boolean))
    : null

  /** @type {Map<string, Map<string, ReturnType<typeof emptyCell>>>} */
  const authorMonthMap = new Map()
  const monthSet = new Set()

  patterns.forEach((item) => {
    const author = String(item.author || '').trim()
    if (!author) return
    if (authorSet && !authorSet.has(author)) return
    if (buyer && String(item.buyer || '').trim() !== buyer) return
    const date = parsePatternDate(item.date)
    if (!date) return
    const month = date.slice(0, 7)
    monthSet.add(month)

    if (!authorMonthMap.has(author)) authorMonthMap.set(author, new Map())
    const monthMap = authorMonthMap.get(author)
    if (!monthMap.has(month)) monthMap.set(month, emptyCell())
    const cell = monthMap.get(month)
    cell.total += 1
    cell[resolveTypeKey(item.type)] += 1
  })

  const months = [...monthSet].sort((a, b) => a.localeCompare(b))

  const authorTotals = new Map()
  authorMonthMap.forEach((monthMap, author) => {
    let sum = 0
    monthMap.forEach((cell) => { sum += cell.total })
    authorTotals.set(author, sum)
  })

  // 按作者总图纸数从多到少；同数量再按名称
  const authors = [...authorMonthMap.keys()].sort((a, b) => {
    const diff = (authorTotals.get(b) || 0) - (authorTotals.get(a) || 0)
    if (diff !== 0) return diff
    return a.localeCompare(b, 'zh-CN')
  })

  /** heatmap data: [monthIndex, authorIndex, total] + meta */
  const heatData = []
  /** @type {ReturnType<typeof emptyCell>[][]} */
  const cells = authors.map(() => months.map(() => emptyCell()))
  let totalPatterns = 0
  let maxTotal = 0

  authors.forEach((author, y) => {
    const monthMap = authorMonthMap.get(author)
    months.forEach((month, x) => {
      const cell = monthMap?.get(month) || emptyCell()
      cells[y][x] = cell
      totalPatterns += cell.total
      if (cell.total > maxTotal) maxTotal = cell.total
      heatData.push({
        value: [x, y, cell.total],
        free: cell.free,
        paid: cell.paid,
        member: cell.member,
      })
    })
  })

  /** 每月作者排名（降序），便于看当月谁最多 */
  const monthlyRankings = months.map((month, monthIndex) => {
    const ranking = authors
      .map((author, authorIndex) => {
        const cell = cells[authorIndex][monthIndex] || emptyCell()
        return {
          author,
          authorIndex,
          monthIndex,
          month,
          free: cell.free,
          paid: cell.paid,
          member: cell.member,
          total: cell.total,
        }
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total
        return a.author.localeCompare(b.author, 'zh-CN')
      })
    return {
      month,
      monthLabel: formatMonthLabel(month),
      monthIndex,
      ranking,
      champion: ranking[0] || null,
    }
  })

  return {
    authors,
    months,
    monthLabels: months.map(formatMonthLabel),
    cells,
    heatData,
    monthlyRankings,
    maxTotal,
    authorCount: authors.length,
    monthCount: months.length,
    totalPatterns,
  }
}

/**
 * 筛选某作者在某月的图纸列表
 * @param {Array} patterns
 * @param {{ author?: string, month?: string, buyer?: string }} options month 为 YYYY-MM
 */
export function filterPatternsByAuthorMonth(patterns = [], options = {}) {
  const author = String(options.author || '').trim()
  const month = String(options.month || '').trim()
  const buyer = String(options.buyer || '').trim()
  if (!author || !/^\d{4}-\d{2}$/.test(month)) return []

  return patterns
    .filter((item) => {
      if (String(item.author || '').trim() !== author) return false
      if (buyer && String(item.buyer || '').trim() !== buyer) return false
      const date = parsePatternDate(item.date)
      if (!date) return false
      return date.slice(0, 7) === month
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

/**
 * 某作者全部图纸（不限月份）
 * @param {Array} patterns
 * @param {{ author?: string, buyer?: string }} options
 */
export function filterPatternsByAuthor(patterns = [], options = {}) {
  const author = String(options.author || '').trim()
  const buyer = String(options.buyer || '').trim()
  if (!author) return []

  return patterns
    .filter((item) => {
      if (String(item.author || '').trim() !== author) return false
      if (buyer && String(item.buyer || '').trim() !== buyer) return false
      return Boolean(parsePatternDate(item.date))
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

/**
 * 某月全部图纸（不限作者）
 * @param {Array} patterns
 * @param {{ month?: string, buyer?: string, authors?: string[] }} options
 */
export function filterPatternsByMonth(patterns = [], options = {}) {
  const month = String(options.month || '').trim()
  const buyer = String(options.buyer || '').trim()
  const authorSet = Array.isArray(options.authors) && options.authors.length
    ? new Set(options.authors.map((name) => String(name || '').trim()).filter(Boolean))
    : null
  if (!/^\d{4}-\d{2}$/.test(month)) return []

  return patterns
    .filter((item) => {
      const author = String(item.author || '').trim()
      if (!author) return false
      if (authorSet && !authorSet.has(author)) return false
      if (buyer && String(item.buyer || '').trim() !== buyer) return false
      const date = parsePatternDate(item.date)
      if (!date) return false
      return date.slice(0, 7) === month
    })
    .sort((a, b) => {
      const byDate = String(b.date || '').localeCompare(String(a.date || ''))
      if (byDate !== 0) return byDate
      return String(a.author || '').localeCompare(String(b.author || ''), 'zh-CN')
    })
}

const TOP_RANK_COUNT = 5

/** 与类型饼图 / 趋势图同色；汇总用芭乐深绿，避免和付费粉撞色 */
const STACK_METRICS = [
  { key: 'member', label: '会员', stack: '会员', yAxisIndex: 0, color: TYPE_META.member.color },
  { key: 'paid', label: '付费', stack: '付费', yAxisIndex: 0, color: TYPE_META.paid.color },
  { key: 'free', label: '免费', stack: '免费', yAxisIndex: 0, color: TYPE_META.free.color },
  { key: 'total', label: '汇总', stack: '汇总', yAxisIndex: 1, color: '#6b9a5c' },
]

export const AUTHOR_MONTHLY_RANK_METRICS = STACK_METRICS.map((item) => ({
  key: item.key,
  label: item.label,
  color: item.color,
  unitLabel: `${item.label}张数`,
}))

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** 同色系由深到浅，rank0=最深（柱顶第1名） */
function buildToneScale(hex, count) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length < 6) return Array.from({ length: count }, () => hex)
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1)
    // 最多掺 32% 白，分段可辨又不发灰发脏
    const mix = t * 0.32
    const rr = clampByte(r + (255 - r) * mix)
    const gg = clampByte(g + (255 - g) * mix)
    const bb = clampByte(b + (255 - b) * mix)
    return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
  })
}

function getRankMetricValue(cell, metric) {
  if (metric === 'member') return Number(cell?.member) || 0
  if (metric === 'paid') return Number(cell?.paid) || 0
  if (metric === 'free') return Number(cell?.free) || 0
  return Number(cell?.total) || 0
}

function buildMonthlyRankingsByMetric(data = {}, metric = 'total') {
  const { authors = [], months = [], monthLabels = [], cells = [] } = data
  return months.map((month, monthIndex) => {
    const ranking = authors
      .map((author, authorIndex) => {
        const cell = cells[authorIndex]?.[monthIndex] || emptyCell()
        const value = getRankMetricValue(cell, metric)
        return {
          author,
          authorIndex,
          monthIndex,
          month,
          free: cell.free,
          paid: cell.paid,
          member: cell.member,
          total: cell.total,
          value,
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value
        if (b.total !== a.total) return b.total - a.total
        return a.author.localeCompare(b.author, 'zh-CN')
      })
    const top = ranking.slice(0, TOP_RANK_COUNT)
    const topSum = top.reduce((sum, item) => sum + item.value, 0)
    // 柱高用全部作者合计，不只前 5 名
    const fullTotal = ranking.reduce((sum, item) => sum + item.value, 0)
    const others = Math.max(0, fullTotal - topSum)
    const othersCount = Math.max(0, ranking.length - top.length)
    return {
      month,
      monthLabel: monthLabels[monthIndex] || formatMonthLabel(month),
      monthIndex,
      ranking,
      top,
      topSum,
      fullTotal,
      others,
      othersCount,
      champion: ranking[0] || null,
    }
  })
}

function emptyRankPoint(monthIndex) {
  return {
    value: 0,
    stackSum: 0,
    author: '',
    authorIndex: -1,
    monthIndex,
    free: 0,
    paid: 0,
    member: 0,
    total: 0,
    rank: 0,
    metric: '',
    metricLabel: '',
    isOthers: false,
  }
}

function mixHex(hex, whiteRatio) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length < 6) return hex
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  const t = Math.max(0, Math.min(1, whiteRatio))
  const rr = clampByte(r + (255 - r) * t)
  const gg = clampByte(g + (255 - g) * t)
  const bb = clampByte(b + (255 - b) * t)
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

/**
 * 每月综合柱图：
 * - 每个月 4 根柱：会员 / 付费 / 免费 / 汇总
 * - 柱高 = 当月全部作者该维度合计
 * - 柱内：前 5 名 +「其他」（其余作者合计）
 * - 汇总用右侧独立 Y 轴
 */
export function getAuthorMonthlyTopRankChartOption(data = {}, options = {}) {
  const topN = Number(options.topN) > 0 ? Number(options.topN) : TOP_RANK_COUNT
  const { monthLabels = [], totalPatterns = 0 } = data

  if (!monthLabels.length || !totalPatterns) {
    return { graphic: emptyGraphic('暂无作者每月图纸数据') }
  }

  const rankingsByMetric = Object.fromEntries(
    STACK_METRICS.map((metric) => [metric.key, buildMonthlyRankingsByMetric(data, metric.key)]),
  )

  const series = []
  STACK_METRICS.forEach((metric) => {
    const monthlyRankings = rankingsByMetric[metric.key] || []
    const tones = buildToneScale(metric.color, topN)

    // 底部先压「其他」（全部作者 − 前5），保证柱高等于全量合计
    series.push({
      name: `${metric.label}-其他`,
      type: 'bar',
      stack: metric.stack,
      yAxisIndex: metric.yAxisIndex,
      barMaxWidth: 40,
      barGap: '40%',
      barCategoryGap: '42%',
      itemStyle: {
        color: mixHex(metric.color, 0.55),
        borderColor: '#ffffff',
        borderWidth: 2,
        borderRadius: 0,
      },
      emphasis: { focus: 'none' },
      label: { show: false },
      data: monthlyRankings.map((monthItem) => ({
        value: monthItem.others,
        stackSum: monthItem.fullTotal,
        author: monthItem.othersCount > 0 ? `其他${monthItem.othersCount}人` : '',
        authorIndex: -1,
        monthIndex: monthItem.monthIndex,
        free: 0,
        paid: 0,
        member: 0,
        total: 0,
        rank: 0,
        metric: metric.key,
        metricLabel: metric.label,
        isOthers: true,
        othersCount: monthItem.othersCount,
      })),
    })

    // 再压入第5名…第1名，第1名在柱顶并标全量合计
    for (let rankIndex = topN - 1; rankIndex >= 0; rankIndex -= 1) {
      const isChampionLayer = rankIndex === 0
      series.push({
        name: isChampionLayer ? metric.label : `${metric.label}-第${rankIndex + 1}名`,
        type: 'bar',
        stack: metric.stack,
        yAxisIndex: metric.yAxisIndex,
        barMaxWidth: 40,
        barGap: '40%',
        barCategoryGap: '42%',
        itemStyle: {
          color: tones[rankIndex],
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: isChampionLayer ? [6, 6, 0, 0] : 0,
        },
        emphasis: {
          focus: 'none',
          itemStyle: {
            shadowBlur: 0,
            borderColor: '#ffffff',
          },
        },
        label: isChampionLayer
          ? {
              show: true,
              position: 'top',
              distance: 6,
              rotate: 0,
              align: 'center',
              verticalAlign: 'bottom',
              color: AXIS.text,
              fontSize: 12,
              fontWeight: 700,
              formatter: (params) => {
                const sum = Number(params?.data?.stackSum) || 0
                return sum > 0 ? String(sum) : ''
              },
            }
          : { show: false },
        labelLayout: {
          hideOverlap: true,
        },
        data: monthlyRankings.map((monthItem) => {
          const hit = monthItem.top[rankIndex]
          if (!hit) {
            return {
              ...emptyRankPoint(monthItem.monthIndex),
              stackSum: monthItem.fullTotal,
              metric: metric.key,
              metricLabel: metric.label,
            }
          }
          return {
            value: hit.value,
            stackSum: monthItem.fullTotal,
            author: hit.author,
            authorIndex: hit.authorIndex,
            monthIndex: hit.monthIndex,
            free: hit.free,
            paid: hit.paid,
            member: hit.member,
            total: hit.total,
            rank: rankIndex + 1,
            metric: metric.key,
            metricLabel: metric.label,
            isOthers: false,
          }
        }),
      })
    }
  })

  return {
    color: STACK_METRICS.map((item) => item.color),
    legend: { show: false },
    tooltip: {
      trigger: 'axis',
      // 挂到 body，避免弹窗 overflow:hidden 裁切最右侧悬停层
      appendTo: typeof document !== 'undefined' ? document.body : undefined,
      confine: false,
      enterable: false,
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(61, 74, 56, 0.06)' } },
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#e4ebe0',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: AXIS.text, fontSize: 12, lineHeight: 17 },
      extraCssText:
        'z-index: 6000; overflow: visible; max-width: none; max-height: none; box-shadow: 0 10px 28px rgba(61,74,56,0.14); pointer-events: none;',
      position: (point, _params, _dom, _rect, size) => {
        // point / 返回值相对图表容器；靠右半边时强制放左侧，避免等内容尺寸算完才发现溢出
        const [x, y] = point
        const boxW = size?.contentSize?.[0] || 300
        const boxH = size?.contentSize?.[1] || 220
        const viewW = size?.viewSize?.[0] || 0
        const viewH = size?.viewSize?.[1] || 0
        const placeLeft = viewW ? x > viewW * 0.42 : true
        let left = placeLeft ? x - boxW - 16 : x + 16
        let top = y - boxH / 2
        if (viewW) left = Math.min(Math.max(8, left), Math.max(8, viewW - boxW - 8))
        if (viewH) top = Math.min(Math.max(8, top), Math.max(8, viewH - boxH - 8))
        return [left, top]
      },
      formatter: (params) => {
        const list = (Array.isArray(params) ? params : [params]).filter(
          (item) => Number(item?.data?.value) > 0,
        )
        if (!list.length) return ''
        const monthLabel = list[0].axisValueLabel || list[0].name || ''
        const groups = new Map()
        list.forEach((item) => {
          const metricLabel = item?.data?.metricLabel || ''
          if (!metricLabel) return
          if (!groups.has(metricLabel)) groups.set(metricLabel, [])
          groups.get(metricLabel).push(item)
        })

        const columns = STACK_METRICS.map((metric) => {
          const items = groups.get(metric.label)
          if (!items?.length) return ''
          const fullTotal =
            Number(items.find((item) => item?.data?.stackSum > 0)?.data?.stackSum) ||
            items.reduce((s, item) => s + (Number(item?.data?.value) || 0), 0)
          const ranked = items
            .filter((item) => !item?.data?.isOthers && Number(item?.data?.rank) > 0)
            .sort((a, b) => (Number(a?.data?.rank) || 0) - (Number(b?.data?.rank) || 0))
          const othersItem = items.find((item) => item?.data?.isOthers)
          const rows = ranked.map((item) => {
            const d = item.data || {}
            return `<div style="white-space:nowrap;">${d.rank}. ${d.author || '—'} ${d.value}</div>`
          })
          if (othersItem && Number(othersItem.data?.value) > 0) {
            const count = Number(othersItem.data?.othersCount) || 0
            rows.push(
              `<div style="white-space:nowrap;color:#8a7a82;">其他${count ? `${count}人` : ''} ${othersItem.data.value}</div>`,
            )
          }
          return `<div style="min-width:112px;">
            <div style="margin-bottom:4px;white-space:nowrap;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${metric.color};margin-right:6px;"></span><b>${metric.label}</b> ${fullTotal}
            </div>
            ${rows.join('')}
          </div>`
        }).filter(Boolean)

        // 2×2，宽度更短，最右侧月份也不容易被裁切
        return `<div style="font-weight:700;margin-bottom:8px;">${monthLabel}</div>
          <div style="display:grid;grid-template-columns:auto auto;gap:10px 16px;align-items:start;">${columns.join('')}</div>`
      },
    },
    grid: {
      left: 20,
      right: 36,
      top: 56,
      bottom: 48,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: monthLabels,
      axisLabel: {
        color: AXIS.axis,
        fontSize: 13,
        interval: 0,
        rotate: 0,
      },
      axisLine: { lineStyle: { color: AXIS.line } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '张数',
        position: 'left',
        minInterval: 1,
        nameTextStyle: { color: AXIS.axis, fontSize: 12, padding: [0, 0, 6, 0] },
        axisLabel: { color: AXIS.axis, fontSize: 12 },
        splitLine: { lineStyle: { color: AXIS.split, type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'value',
        name: '汇总',
        position: 'right',
        minInterval: 1,
        nameTextStyle: { color: '#6b9a5c', fontSize: 12, padding: [0, 0, 6, 0] },
        axisLabel: { color: '#6b9a5c', fontSize: 12 },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series,
  }
}

const AUTHOR_TYPE_METRICS = [
  { key: 'member', label: TYPE_META.member.label, color: TYPE_META.member.color },
  { key: 'paid', label: TYPE_META.paid.label, color: TYPE_META.paid.color },
  { key: 'free', label: TYPE_META.free.label, color: TYPE_META.free.color },
]

export const AUTHOR_TYPE_RANK_METRICS = AUTHOR_TYPE_METRICS

/**
 * 作者排行：横向堆叠条（会员/付费/免费），按总张数排序
 * 点击某作者可看其全部图纸
 */
export function getAuthorTypeRankChartOption(data = {}) {
  const { authors = [], cells = [], totalPatterns = 0 } = data

  if (!authors.length || !totalPatterns) {
    return { graphic: emptyGraphic('暂无作者图纸数据') }
  }

  const rows = authors
    .map((author, authorIndex) => {
      const rowCells = cells[authorIndex] || []
      const free = rowCells.reduce((sum, cell) => sum + (Number(cell?.free) || 0), 0)
      const paid = rowCells.reduce((sum, cell) => sum + (Number(cell?.paid) || 0), 0)
      const member = rowCells.reduce((sum, cell) => sum + (Number(cell?.member) || 0), 0)
      return {
        author,
        authorIndex,
        free,
        paid,
        member,
        total: free + paid + member,
      }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return a.author.localeCompare(b.author, 'zh-CN')
    })

  if (!rows.length) {
    return { graphic: emptyGraphic('暂无作者图纸数据') }
  }

  const showYZoom = rows.length > 14
  const initialYEnd = showYZoom
    ? Math.min(100, Math.round((14 / rows.length) * 100))
    : 100

  // inverse 后，数组末尾在视觉顶部；为让第 1 名在上，反转绘制顺序
  const visualRows = [...rows].reverse()
  const names = visualRows.map((row) => row.author)

  return {
    color: AUTHOR_TYPE_METRICS.map((item) => item.color),
    legend: { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(61, 74, 56, 0.06)' } },
      appendTo: typeof document !== 'undefined' ? document.body : undefined,
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#e4ebe0',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: AXIS.text, fontSize: 12, lineHeight: 18 },
      extraCssText:
        'z-index: 6000; overflow: visible; box-shadow: 0 10px 28px rgba(61,74,56,0.14); pointer-events: none;',
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params]
        if (!list.length) return ''
        const author = list[0]?.name || ''
        const row = visualRows.find((item) => item.author === author)
        if (!row) return ''
        const lines = [
          `<div style="font-weight:700;margin-bottom:4px;">${author}</div>`,
          `<div style="color:#6d7a68;margin-bottom:6px;">合计 <b style="color:#3d4a38;">${row.total}</b> 张</div>`,
        ]
        AUTHOR_TYPE_METRICS.forEach((metric) => {
          const value = row[metric.key]
          if (!(value > 0)) return
          lines.push(
            `<div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
              <span style="width:8px;height:8px;border-radius:2px;background:${metric.color};"></span>
              <span>${metric.label}</span>
              <span style="margin-left:auto;font-weight:650;">${value}</span>
            </div>`,
          )
        })
        return `<div style="min-width:148px;">${lines.join('')}</div>`
      },
    },
    grid: {
      left: 8,
      right: 56,
      top: 12,
      bottom: showYZoom ? 18 : 8,
      containLabel: true,
    },
    dataZoom: showYZoom
      ? [
          {
            type: 'slider',
            yAxisIndex: 0,
            width: 12,
            right: 8,
            borderColor: '#e4ebe0',
            fillerColor: 'rgba(139, 207, 122, 0.2)',
            handleStyle: { color: '#8bcf7a' },
            textStyle: { color: AXIS.axis, fontSize: 10 },
            start: Math.max(0, 100 - initialYEnd),
            end: 100,
          },
          {
            type: 'inside',
            yAxisIndex: 0,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
            start: Math.max(0, 100 - initialYEnd),
            end: 100,
          },
        ]
      : undefined,
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: AXIS.axis, fontSize: 12 },
      splitLine: { lineStyle: { color: AXIS.split, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        color: AXIS.text,
        fontSize: 12,
        width: 108,
        overflow: 'truncate',
        margin: 12,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      ...AUTHOR_TYPE_METRICS.map((metric, metricIndex) => {
        const isLast = metricIndex === AUTHOR_TYPE_METRICS.length - 1
        return {
          name: metric.label,
          type: 'bar',
          stack: 'author-type',
          barMaxWidth: 22,
          barCategoryGap: '36%',
          itemStyle: {
            color: metric.color,
            borderRadius: isLast ? [0, 7, 7, 0] : 0,
          },
          emphasis: { focus: 'series' },
          data: visualRows.map((row) => ({
            value: row[metric.key],
            author: row.author,
            authorIndex: row.authorIndex,
            total: row.total,
            view: 'author-rank',
          })),
        }
      }),
      // 透明总量条，保证右侧总数标签始终显示
      {
        name: '_total',
        type: 'bar',
        barGap: '-100%',
        barMaxWidth: 22,
        silent: true,
        legendHoverLink: false,
        tooltip: { show: false },
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: AXIS.text,
          fontSize: 12,
          fontWeight: 700,
          formatter: (params) => {
            const total = Number(params?.value) || 0
            return total > 0 ? String(total) : ''
          },
        },
        data: visualRows.map((row) => row.total),
      },
    ],
  }
}

/** @deprecated 保留旧名，避免外部旧引用报错 */
export function getAuthorMonthlyTypeStackChartOption(data = {}) {
  return getAuthorTypeRankChartOption(data)
}
