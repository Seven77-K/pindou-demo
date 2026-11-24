/** 统计图表用色：柔和粉紫蓝黄系，作者多时仍靠色相分散区分 */

const GOLDEN_ANGLE = 137.508

/**
 * 作者维度专用色板：base 用于饼图，gradient 用于柱图渐变
 * 色相间隔大、饱和度适中，贴合后台整体风格
 */
const authorChartPalette = [
  { base: '#f2a0b0', gradient: ['#ffd8e2', '#e07890'] },
  { base: '#7eb8e0', gradient: ['#b8dcf5', '#5598c8'] },
  { base: '#a898d8', gradient: ['#d4c8f0', '#8878c0'] },
  { base: '#e8b878', gradient: ['#ffe8c8', '#d09850'] },
  { base: '#78c8b8', gradient: ['#b8e8dc', '#50a898'] },
  { base: '#e890c0', gradient: ['#f8cce0', '#c868a0'] },
  { base: '#8898e0', gradient: ['#c0c8f0', '#6878c0'] },
  { base: '#e0a890', gradient: ['#f8d8c8', '#c88068'] },
  { base: '#68b8c0', gradient: ['#a8dce0', '#4898a0'] },
  { base: '#c898d0', gradient: ['#e8d0f0', '#a878b8'] },
  { base: '#88a8e0', gradient: ['#c0d4f0', '#6888c0'] },
  { base: '#d0b898', gradient: ['#f0e0c8', '#b09870'] },
  { base: '#f09888', gradient: ['#fcd0c8', '#d87868'] },
  { base: '#98c0a0', gradient: ['#c8e0cc', '#78a080'] },
  { base: '#b888c0', gradient: ['#dcc8e0', '#9868a8'] },
  { base: '#90b8d8', gradient: ['#c8dff0', '#6898b8'] },
  { base: '#e8a8b8', gradient: ['#fcd8e0', '#c87888'] },
  { base: '#88c8b0', gradient: ['#c0e8d8', '#58a890'] },
  { base: '#c0a0c8', gradient: ['#e0d0e8', '#9878a0'] },
  { base: '#e8d080', gradient: ['#f8f0c0', '#c0a850'] },
  { base: '#d89098', gradient: ['#f0c8cc', '#b06870'] },
  { base: '#78c0d8', gradient: ['#b8e0f0', '#48a0c0'] },
  { base: '#a890d0', gradient: ['#d0c8f0', '#8870b0'] },
  { base: '#b0a8c0', gradient: ['#d8d0e8', '#908898'] },
  { base: '#c8a878', gradient: ['#ecd8b8', '#a88850'] },
  { base: '#88b0d0', gradient: ['#c0d8ec', '#5890b0'] },
  { base: '#d8a0c8', gradient: ['#f0d0e8', '#b070a0'] },
  { base: '#80c8a8', gradient: ['#b8e8d0', '#48a880'] },
  { base: '#c0b0e0', gradient: ['#e0d8f0', '#9888c0'] },
  { base: '#e0c090', gradient: ['#f8e8c8', '#c0a060'] },
]

/** 首页等通用饼图色（取自作者色板 base） */
export const chartPieColors = authorChartPalette.map((item) => item.base)

function hashLabel(label) {
  let h = 0
  const s = String(label)
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pickInRange(min, max, n) {
  return min + (n % (max - min + 1))
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
    .join('')}`
}

function lightenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function darkenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function softHslColor(index, nameSeed) {
  const hue = (index * GOLDEN_ANGLE + (nameSeed % 11) * 3) % 360
  const band = Math.floor(index / 10)
  const saturation = pickInRange(42, 56, nameSeed + band * 3)
  const lightness = pickInRange(66, 76, nameSeed + band * 5 + index)
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`
}

function softHslGradient(h, s, l) {
  return [
    `hsl(${h}, ${Math.max(s - 10, 32)}%, ${Math.min(l + 10, 84)}%)`,
    `hsl(${h}, ${Math.min(s + 2, 62)}%, ${Math.max(l - 10, 54)}%)`,
  ]
}

/**
 * 饼图 / 作者维度取色：序号驱动黄金角色相，柔和但相邻扇区可区分
 */
export function getChartPieColor(key, index = 0) {
  const i = Number.isFinite(index) && index >= 0 ? index : 0
  const nameSeed = key != null && key !== '' ? hashLabel(key) : i

  if (i < authorChartPalette.length) {
    return authorChartPalette[i].base
  }

  return softHslColor(i, nameSeed)
}

/** 由作者色衍生柱图渐变（与饼图同色体系） */
export function getChartBarGradientPair(key, index = 0) {
  const i = Number.isFinite(index) && index >= 0 ? index : 0
  const nameSeed = key != null && key !== '' ? hashLabel(key) : i

  if (i < authorChartPalette.length) {
    return [...authorChartPalette[i].gradient]
  }

  const base = softHslColor(i, nameSeed)
  const match = base.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (match) {
    return softHslGradient(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  const color = getChartPieColor(key, index)
  return [lightenHex(color, 0.18), darkenHex(color, 0.08)]
}

/** 竖向柱图渐变：[顶部浅色, 底部深色] */
export const chartBarGradientPairs = [
  ['#ffd4a8', '#ff9f43'],
  ['#a8d8ff', '#4a90e2'],
  ['#c8f0a8', '#6dbf4a'],
  ['#ffb8d4', '#e056a0'],
  ['#d4c4ff', '#8b5cf6'],
  ['#ffe4a0', '#f5b942'],
  ['#a8f0e8', '#2db5a8'],
  ['#ffc8b8', '#e8785a'],
  ['#c8e6ff', '#3d8bfd'],
  ['#f5c6e0', '#d63384'],
  ['#d8f3dc', '#52b788'],
  ['#ffe5d9', '#e76f51'],
  ['#e0c3fc', '#7b2cbf'],
  ['#caf0f8', '#0077b6'],
  ['#ffd6ff', '#c77dff'],
  ['#fdffb6', '#c9a227'],
  ['#ffcfd2', '#e63946'],
  ['#b8f2e6', '#1d9e75'],
  ['#dee2ff', '#5c4dff'],
  ['#ffecd1', '#f4a261'],
  ['#d7e3fc', '#4361ee'],
  ['#f8edeb', '#d65a5a'],
  ['#e2ece9', '#40916c'],
  ['#f3d9e4', '#b56576'],
  ['#e8f4f8', '#4895ef'],
  ['#fff1e6', '#e85d04'],
  ['#e7ecef', '#6c757d'],
  ['#f0e6ff', '#9d4edd'],
  ['#e9ff70', '#8a9a00'],
  ['#ffc8dd', '#ff006e'],
  ['#bde0fe', '#1d3557'],
  ['#cdb4db', '#6a4c93'],
  ['#a2d2ff', '#023e8a'],
  ['#ffcad4', '#c9184a'],
  ['#d8e2dc', '#588157'],
  ['#f1faee', '#457b9d'],
  ['#fefae0', '#bc6c25'],
  ['#e9edc9', '#606c38'],
  ['#ffb4a2', '#9d0208'],
  ['#e0fbfc', '#219ebc'],
  ['#f4978e', '#d62828'],
  ['#83c5be', '#006d77'],
  ['#e5989b', '#b5838d'],
  ['#a7c957', '#386641'],
  ['#6a994e', '#344e41'],
  ['#588157', '#1b4332'],
  ['#457b9d', '#1d3557'],
  ['#cdb4db', '#5a189a'],
  ['#b8c0ff', '#3f37c9'],
  ['#90e0ef', '#0077b6'],
  ['#ffd6a5', '#e76f51'],
]

/** 花费 · 月度趋势柱图专用（统一蓝绿系，与分类柱图区分） */
export const costMonthlyBarGradient = ['#b8e8f0', '#3a9eb0']

export const typeRatioGradients = {
  all: ['#ffd1ff', '#a83858'],
  free: ['#b8f0e8', '#5ec9b8'],
  member: ['#f0d4ff', '#c49bff'],
  paid: ['#ffe0d4', '#ff8fa3'],
}
