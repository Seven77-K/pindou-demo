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

/** 四图分色系：豆板蓝青 / 豆笔紫 / 豆铲粉 / 其他青绿；同图内每柱深浅错落 */
export const TOOL_CHART_THEMES = {
  board: {
    hue: 200,
    gradients: [
      ['#c5ecff', '#4da3e8'],
      ['#9de4ff', '#2d94db'],
      ['#7ad8ff', '#1a85cc'],
      ['#b0f0ff', '#5eb8e8'],
      ['#88d4f5', '#2899c4'],
      ['#6ec8f0', '#1588b8'],
      ['#d4f4ff', '#72b8e8'],
      ['#a8e0ff', '#3d9ad4'],
      ['#90d8ff', '#2488c0'],
      ['#e0f7ff', '#82c4f0'],
      ['#bce8ff', '#52a8dc'],
      ['#78ccff', '#1078b0'],
    ],
    axisLine: '#cce8f5',
    splitLine: '#e8f4fa',
  },
  pen: {
    hue: 275,
    gradients: [
      ['#ead8ff', '#9b72e8'],
      ['#dcc8ff', '#8855e0'],
      ['#ceb8ff', '#7540d4'],
      ['#f0e4ff', '#b388ff'],
      ['#e0ccff', '#9d6fe8'],
      ['#d0b4ff', '#8758d8'],
      ['#f5ecff', '#c49bff'],
      ['#e8d8ff', '#a878f0'],
      ['#d8c0ff', '#9068e0'],
      ['#ede0ff', '#b898f8'],
      ['#dcc8f5', '#8860d0'],
      ['#c8b0ff', '#7048c8'],
    ],
    axisLine: '#e8dcf5',
    splitLine: '#f2ecfa',
  },
  scoop: {
    hue: 340,
    gradients: [
      ['#ffd8ea', '#f472b6'],
      ['#ffc8e0', '#ec4899'],
      ['#ffb8d6', '#e03888'],
      ['#ffe8f2', '#f9a8d4'],
      ['#ffd4e6', '#f687b3'],
      ['#ffc0d8', '#e870a0'],
      ['#fff0f6', '#ff8fab'],
      ['#ffe0ec', '#ff7aa0'],
      ['#ffd0e2', '#f06292'],
      ['#fce4ec', '#f48fb1'],
      ['#ffdce8', '#ef6898'],
      ['#ffc8dc', '#e05588'],
    ],
    axisLine: '#f5dce8',
    splitLine: '#faf0f4',
  },
  other: {
    hue: 158,
    gradients: [
      ['#baf5e4', '#34d399'],
      ['#9ef0d8', '#20c997'],
      ['#82eccc', '#12b886'],
      ['#c8f8e8', '#6ee7b7'],
      ['#a8f0d8', '#40d4a0'],
      ['#8ce8c8', '#28c088'],
      ['#d4faec', '#78ddb0'],
      ['#b0f0d4', '#48c898'],
      ['#94e8c4', '#30b880'],
      ['#e0faf0', '#88e0b8'],
      ['#c0f0dc', '#58c890'],
      ['#7ee0b8', '#18a870'],
    ],
    axisLine: '#cceee0',
    splitLine: '#e8f6ef',
  },
}

const AXIS_TEXT = '#52404a'
const LABEL_TEXT = '#52404a'
const GRID_TEXT = '#6e5660'

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

function getTheme(themeKey) {
  return TOOL_CHART_THEMES[themeKey] || TOOL_CHART_THEMES.board
}

function getBarColor(themeKey, index) {
  const theme = getTheme(themeKey)
  if (index < theme.gradients.length) {
    const [top, bottom] = theme.gradients[index]
    return barGradient(top, bottom)
  }

  const step = index - theme.gradients.length
  const hue = theme.hue + ((step % 5) - 2) * 8
  const satTop = 55 + (step % 3) * 8
  const satBottom = satTop + 10
  const lightTop = 78 - (step % 4) * 5
  const lightBottom = lightTop - 28
  return barGradient(
    `hsl(${hue}, ${satTop}%, ${lightTop}%)`,
    `hsl(${hue}, ${satBottom}%, ${lightBottom}%)`,
  )
}

function buildThemedAxisStyle(themeKey) {
  const theme = getTheme(themeKey)
  return {
    axisLabel: { color: AXIS_TEXT, fontSize: 12 },
    axisLine: { lineStyle: { color: theme.axisLine } },
    splitLine: { lineStyle: { color: theme.splitLine, type: 'dashed' } },
  }
}

function buildBaseChartOption(themeKey) {
  const axisStyle = buildThemedAxisStyle(themeKey)
  return {
    axisStyle,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#f0e4ea',
      textStyle: { color: GRID_TEXT, fontSize: 13 },
    },
    barSeries: {
      type: 'bar',
      barMaxWidth: 40,
      label: {
        show: true,
        position: 'top',
        distance: 4,
        color: LABEL_TEXT,
        fontSize: 12,
        fontWeight: 500,
      },
    },
  }
}

function formatPenAxisLabel(item) {
  if (!item) return ''
  const material = String(item.material || '').trim()
  const spec = String(item.spec || '').trim()
  if (spec === '—') {
    return material || '未填'
  }
  if (material && spec) return `${material}${spec}`
  return material || spec || '未填'
}

export function getPenBarChartOption(items, emptyText = '暂无拼豆笔数据', themeKey = 'pen') {
  const amounts = items.map((item) => item.value)
  const hasData = amounts.some((value) => value > 0)

  if (!hasData || !items.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  const categories = items.map((_, index) => index)
  const base = buildBaseChartOption(themeKey)

  return {
    tooltip: {
      ...base.tooltip,
      formatter: (params) => {
        const index = params[0]?.dataIndex ?? 0
        const item = items[index]
        if (!item) return ''
        const lines = []
        if (item.material) lines.push(`材质：${item.material}`)
        lines.push(`规格：${item.spec === '—' ? '未填' : item.spec}`)
        lines.push(`数量：${item.value} 件`)
        return lines.join('<br/>')
      },
    },
    grid: {
      left: 40,
      right: 16,
      top: 28,
      bottom: 36,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: AXIS_TEXT,
        fontSize: 12,
        interval: 0,
        rotate: 0,
        overflow: 'truncate',
        width: 72,
        formatter: (value) => formatPenAxisLabel(items[Number(value)]),
      },
      axisLine: base.axisStyle.axisLine,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: base.axisStyle.axisLabel,
      splitLine: base.axisStyle.splitLine,
    },
    series: [
      {
        ...base.barSeries,
        label: {
          ...base.barSeries.label,
          formatter: (params) => (params.value > 0 ? String(params.value) : ''),
        },
        data: amounts.map((value, index) => ({
          value,
          itemStyle: {
            color: getBarColor(themeKey, index),
            borderRadius: [5, 5, 0, 0],
          },
        })),
      },
    ],
  }
}

export function getToolCountBarChartOption(items, emptyText = '暂无数据', themeKey = 'board') {
  const categories = items.map((item) => item.name)
  const amounts = items.map((item) => item.value)
  const hasData = amounts.some((value) => value > 0)

  if (!hasData || !categories.length) {
    return { graphic: emptyChartGraphic(emptyText) }
  }

  const base = buildBaseChartOption(themeKey)

  return {
    tooltip: {
      ...base.tooltip,
      formatter: (params) => {
        const item = params[0]
        return `${item.axisValue}<br/>${item.value} 件`
      },
    },
    grid: {
      left: 40,
      right: 16,
      top: 28,
      bottom: 36,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: AXIS_TEXT,
        fontSize: 12,
        interval: 0,
        rotate: 0,
        overflow: 'truncate',
        width: 56,
      },
      axisLine: base.axisStyle.axisLine,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: base.axisStyle.axisLabel,
      splitLine: base.axisStyle.splitLine,
    },
    series: [
      {
        ...base.barSeries,
        label: {
          ...base.barSeries.label,
          formatter: (params) => (params.value > 0 ? String(params.value) : ''),
        },
        data: amounts.map((value, index) => ({
          value,
          itemStyle: {
            color: getBarColor(themeKey, index),
            borderRadius: [5, 5, 0, 0],
          },
        })),
      },
    ],
  }
}
