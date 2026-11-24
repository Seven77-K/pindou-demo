import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {
  BOARD_ALL_SLUG,
  BOARD_DEFECT_OPTIONS,
  BOARD_SIZES,
  BOARD_STATUS_OPTIONS,
  fromBoardSlug,
  toBoardSlug,
} from '@/view/tools/constants'

dayjs.extend(customParseFormat)

const MAX_IMPORT_ROWS = 500

const STATUS_VALUES = new Set(BOARD_STATUS_OPTIONS.map((opt) => opt.value))
const DEFECT_VALUES = new Set(BOARD_DEFECT_OPTIONS.map((opt) => opt.value))

const STATUS_OPTION_TEXT = BOARD_STATUS_OPTIONS.map((opt) => opt.value).join(' / ')
const DEFECT_OPTION_TEXT = BOARD_DEFECT_OPTIONS.map((opt) => opt.value).join(' / ')

const TOOL_IMPORT_CONFIG = {
  board: {
    label: '拼豆板',
    sheetName: '拼豆板',
    fileName: '拼豆板导入模板.xlsx',
    headers: ['豆板名称', '规格', '底板', '品牌', '购买渠道', '购买日期', '价格', '数量', '状态', '瑕疵状态', '备注'],
    example: [
      ['示例豆板A', '52×52', '透明', '某品牌', '淘宝', '2025-01-15', 28, 1, '在用', '无暇', ''],
      ['示例豆板B', '52×52', '白色', '', '拼多多', '2025-02-01', 35, 2, '在途', '-', '运输中'],
      ['示例豆板C', '78×78', '透明', '闲鱼卖家', '闲鱼', '2025-03-01', 20, 1, '已售', '微瑕', ''],
    ],
    guide: [
      ['字段', '可选值 / 说明'],
      ['状态', `${STATUS_OPTION_TEXT}（填 - 视为在用）`],
      ['瑕疵状态', `${DEFECT_OPTION_TEXT}（无瑕 等同 无暇；填 - 表示无瑕疵记录）`],
      ['规格', BOARD_SIZES.join('、')],
      ['数量', '大于 0 的整数，留空默认为 1'],
      ['购买日期', 'YYYY-MM-DD，如 2025-01-15'],
      ['价格', '非负数字，可留空'],
    ],
    columns: {
      name: ['豆板名称', '名称', 'name'],
      size: ['规格', 'size'],
      basePlate: ['底板', 'baseplate'],
      brand: ['品牌', 'brand'],
      channel: ['购买渠道', '渠道', 'channel'],
      purchaseDate: ['购买日期', '日期', 'purchasedate'],
      price: ['价格', 'price'],
      stock: ['数量', 'stock'],
      status: ['状态', 'status'],
      defectStatus: ['瑕疵状态', '瑕疵', 'defectstatus'],
      note: ['备注', 'note'],
    },
    previewFields: [
      { key: 'name', label: '豆板名称' },
      { key: 'size', label: '规格' },
      { key: 'basePlate', label: '底板' },
      { key: 'brand', label: '品牌' },
      { key: 'channel', label: '购买渠道' },
      { key: 'purchaseDate', label: '购买日期' },
      { key: 'price', label: '价格' },
      { key: 'stock', label: '数量' },
      { key: 'status', label: '状态' },
      { key: 'defectStatus', label: '瑕疵状态' },
    ],
  },
  pen: {
    label: '拼豆笔',
    sheetName: '拼豆笔',
    fileName: '拼豆笔导入模板.xlsx',
    headers: ['豆笔名称', '材质', '样式', '规格', '品牌', '购买渠道', '购买日期', '价格', '状态', '备注'],
    example: [
      ['示例豆笔A', '钢针', '单针', '80', '某品牌', '拼多多', '2025-02-01', 15, '在用', ''],
      ['示例豆笔B', '塑料', '双针', '100', '', '淘宝', '2025-03-01', 18, '在途', ''],
    ],
    guide: [
      ['字段', '可选值 / 说明'],
      ['状态', STATUS_OPTION_TEXT],
      ['购买日期', 'YYYY-MM-DD，如 2025-01-15'],
      ['价格', '非负数字，可留空'],
    ],
    columns: {
      name: ['豆笔名称', '名称', 'name'],
      material: ['材质', 'material'],
      style: ['样式', 'style'],
      spec: ['规格', 'spec'],
      brand: ['品牌', 'brand'],
      channel: ['购买渠道', '渠道', 'channel'],
      purchaseDate: ['购买日期', '日期', 'purchasedate'],
      price: ['价格', 'price'],
      status: ['状态', 'status'],
      note: ['备注', 'note'],
    },
    previewFields: [
      { key: 'name', label: '豆笔名称' },
      { key: 'material', label: '材质' },
      { key: 'style', label: '样式' },
      { key: 'spec', label: '规格' },
      { key: 'brand', label: '品牌' },
      { key: 'channel', label: '购买渠道' },
      { key: 'purchaseDate', label: '购买日期' },
      { key: 'price', label: '价格' },
      { key: 'status', label: '状态' },
    ],
  },
  scoop: {
    label: '拼豆铲',
    sheetName: '拼豆铲',
    fileName: '拼豆铲导入模板.xlsx',
    headers: ['豆铲名称', '规格', '颜色样式', '购买渠道', '购买日期', '价格', '状态', '备注'],
    example: [
      ['示例豆铲A', '标准', '粉色', '淘宝', '2025-03-01', 12, '在用', ''],
      ['示例豆铲B', '小号', '蓝色', '拼多多', '2025-04-01', 10, '在途', ''],
    ],
    guide: [
      ['字段', '可选值 / 说明'],
      ['状态', STATUS_OPTION_TEXT],
      ['购买日期', 'YYYY-MM-DD，如 2025-01-15'],
      ['价格', '非负数字，可留空'],
    ],
    columns: {
      name: ['豆铲名称', '名称', 'name'],
      spec: ['规格', 'spec'],
      colorStyle: ['颜色样式', '颜色', 'colorstyle'],
      channel: ['购买渠道', '渠道', 'channel'],
      purchaseDate: ['购买日期', '日期', 'purchasedate'],
      price: ['价格', 'price'],
      status: ['状态', 'status'],
      note: ['备注', 'note'],
    },
    previewFields: [
      { key: 'name', label: '豆铲名称' },
      { key: 'spec', label: '规格' },
      { key: 'colorStyle', label: '颜色样式' },
      { key: 'channel', label: '购买渠道' },
      { key: 'purchaseDate', label: '购买日期' },
      { key: 'price', label: '价格' },
      { key: 'status', label: '状态' },
    ],
  },
  other: {
    label: '其他工具',
    sheetName: '其他工具',
    fileName: '其他工具导入模板.xlsx',
    headers: ['工具名称', '类别', '规格', '数量', '购买渠道', '购买日期', '价格', '状态', '备注'],
    example: [
      ['收纳盒A', '收纳', '大号', 2, '京东', '2025-04-01', 35, '在用', ''],
      ['收纳盒B', '收纳', '中号', 1, '淘宝', '2025-05-01', 28, '在途', ''],
    ],
    guide: [
      ['字段', '可选值 / 说明'],
      ['状态', STATUS_OPTION_TEXT],
      ['数量', '大于 0 的整数'],
      ['购买日期', 'YYYY-MM-DD，如 2025-01-15'],
      ['价格', '非负数字，可留空'],
    ],
    columns: {
      name: ['工具名称', '名称', 'name'],
      category: ['类别', 'category'],
      spec: ['规格', 'spec'],
      stock: ['数量', 'stock'],
      channel: ['购买渠道', '渠道', 'channel'],
      purchaseDate: ['购买日期', '日期', 'purchasedate'],
      price: ['价格', 'price'],
      status: ['状态', 'status'],
      note: ['备注', 'note'],
    },
    previewFields: [
      { key: 'name', label: '工具名称' },
      { key: 'category', label: '类别' },
      { key: 'spec', label: '规格' },
      { key: 'stock', label: '数量' },
      { key: 'channel', label: '购买渠道' },
      { key: 'purchaseDate', label: '购买日期' },
      { key: 'price', label: '价格' },
      { key: 'status', label: '状态' },
    ],
  },
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function cellText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isDashLike(text) {
  return /^[-－—–﹣⁻]$/.test(text)
}

function normalizeStatusInput(value) {
  const text = cellText(value)
  if (!text || isDashLike(text)) return '在用'
  return text
}

function normalizeDefectStatusInput(value) {
  const text = cellText(value)
  if (!text) return '无暇'
  if (isDashLike(text)) return '-'
  const aliases = {
    无瑕: '无暇',
    无瑕疵: '无暇',
    没瑕: '无暇',
    完美: '无暇',
  }
  return aliases[text] || text
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
    }
  }

  const text = cellText(value)
  if (!text) return ''

  const formats = ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYY年M月D日']
  for (const format of formats) {
    const parsed = dayjs(text, format, true)
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
  }

  const loose = dayjs(text)
  if (loose.isValid()) return loose.format('YYYY-MM-DD')

  return text
}

function parsePrice(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return { price: '', error: '价格需为非负数字' }
  return { price: Math.round(num * 100) / 100, error: '' }
}

function parseStatus(value) {
  const text = normalizeStatusInput(value)
  if (!STATUS_VALUES.has(text)) {
    return {
      status: '',
      error: `状态需为：${BOARD_STATUS_OPTIONS.map((opt) => opt.value).join(' / ')}（填 - 视为在用）`,
    }
  }
  return { status: text, error: '' }
}

function parseDefectStatus(value) {
  const text = normalizeDefectStatusInput(value)
  if (!DEFECT_VALUES.has(text)) {
    return {
      defectStatus: '',
      error: `瑕疵状态需为：${BOARD_DEFECT_OPTIONS.map((opt) => opt.value).join(' / ')}（无瑕 等同 无暇）`,
    }
  }
  return { defectStatus: text, error: '' }
}

function parseBoardStock(value) {
  if (value === null || value === undefined || value === '') {
    return { stock: 1, error: '' }
  }
  const num = Number(value)
  if (!Number.isFinite(num) || num < 1) {
    return { stock: 0, error: '数量需为大于 0 的整数' }
  }
  return { stock: Math.floor(num), error: '' }
}

function parseStock(value) {
  if (value === null || value === undefined || value === '') {
    return { stock: 0, error: '数量不能为空' }
  }
  const num = Number(value)
  if (!Number.isFinite(num) || num < 1) {
    return { stock: 0, error: '数量需为大于 0 的整数' }
  }
  return { stock: Math.floor(num), error: '' }
}

function normalizeBoardSizeText(value) {
  return cellText(value).replace(/\*/g, '×').replace(/x/gi, '×')
}

function matchBoardSize(value) {
  const text = normalizeBoardSizeText(value)
  if (!text) return null
  return (
    BOARD_SIZES.find((size) => size === text || toBoardSlug(size) === toBoardSlug(text)) || null
  )
}

function buildColumnIndexMap(headers, columns) {
  const map = {}
  headers.forEach((header, index) => {
    const key = findColumnKey(header, columns)
    if (key && map[key] === undefined) map[key] = index
  })
  return map
}

function findColumnKey(header, columns) {
  const normalized = normalizeHeader(header)
  if (!normalized) return null
  for (const [key, aliases] of Object.entries(columns)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return key
    }
  }
  return null
}

function readRowCells(row, columnIndexMap, columns) {
  const cells = {}
  Object.keys(columns).forEach((key) => {
    const index = columnIndexMap[key]
    cells[key] = index === undefined ? '' : row[index]
  })
  return cells
}

function validateBoardRow(cells, context = {}) {
  const errors = []
  const name = cellText(cells.name)
  if (!name) errors.push('豆板名称不能为空')

  let size = matchBoardSize(cells.size)
  const defaultSlug = context.defaultBoardSlug

  if (!size && defaultSlug && defaultSlug !== BOARD_ALL_SLUG) {
    size = matchBoardSize(fromBoardSlug(defaultSlug))
  }

  if (!size) {
    if (cellText(cells.size)) {
      errors.push(`规格无效，需为：${BOARD_SIZES.join('、')}`)
    } else {
      errors.push('规格不能为空')
    }
  }

  const statusResult = parseStatus(cells.status)
  if (statusResult.error) errors.push(statusResult.error)

  const defectResult = parseDefectStatus(cells.defectStatus)
  if (defectResult.error) errors.push(defectResult.error)

  const priceResult = parsePrice(cells.price)
  if (priceResult.error) errors.push(priceResult.error)

  const stockResult = parseBoardStock(cells.stock)
  if (stockResult.error) errors.push(stockResult.error)

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      size: size || cellText(cells.size),
      sizeSlug: size ? toBoardSlug(size) : '',
      basePlate: cellText(cells.basePlate),
      brand: cellText(cells.brand),
      channel: cellText(cells.channel),
      purchaseDate: parseExcelDate(cells.purchaseDate),
      price: priceResult.price,
      stock: stockResult.stock || 1,
      status: statusResult.status || normalizeStatusInput(cells.status),
      defectStatus: defectResult.defectStatus || normalizeDefectStatusInput(cells.defectStatus),
      note: cellText(cells.note),
    },
  }
}

function validatePenRow(cells) {
  const errors = []
  const name = cellText(cells.name)
  if (!name) errors.push('豆笔名称不能为空')

  const statusResult = parseStatus(cells.status)
  if (statusResult.error) errors.push(statusResult.error)

  const priceResult = parsePrice(cells.price)
  if (priceResult.error) errors.push(priceResult.error)

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      material: cellText(cells.material),
      style: cellText(cells.style),
      spec: cellText(cells.spec),
      brand: cellText(cells.brand),
      channel: cellText(cells.channel),
      purchaseDate: parseExcelDate(cells.purchaseDate),
      price: priceResult.price,
      status: statusResult.status || '在用',
      note: cellText(cells.note),
    },
  }
}

function validateScoopRow(cells) {
  const errors = []
  const name = cellText(cells.name)
  if (!name) errors.push('豆铲名称不能为空')

  const statusResult = parseStatus(cells.status)
  if (statusResult.error) errors.push(statusResult.error)

  const priceResult = parsePrice(cells.price)
  if (priceResult.error) errors.push(priceResult.error)

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      spec: cellText(cells.spec),
      colorStyle: cellText(cells.colorStyle),
      channel: cellText(cells.channel),
      purchaseDate: parseExcelDate(cells.purchaseDate),
      price: priceResult.price,
      status: statusResult.status || '在用',
      note: cellText(cells.note),
    },
  }
}

function validateOtherRow(cells) {
  const errors = []
  const name = cellText(cells.name)
  if (!name) errors.push('工具名称不能为空')

  const stockResult = parseStock(cells.stock)
  if (stockResult.error) errors.push(stockResult.error)

  const statusResult = parseStatus(cells.status)
  if (statusResult.error) errors.push(statusResult.error)

  const priceResult = parsePrice(cells.price)
  if (priceResult.error) errors.push(priceResult.error)

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      category: cellText(cells.category),
      spec: cellText(cells.spec),
      stock: stockResult.stock || 1,
      channel: cellText(cells.channel),
      purchaseDate: parseExcelDate(cells.purchaseDate),
      price: priceResult.price,
      status: statusResult.status || '在用',
      note: cellText(cells.note),
    },
  }
}

const VALIDATORS = {
  board: validateBoardRow,
  pen: validatePenRow,
  scoop: validateScoopRow,
  other: validateOtherRow,
}

export function getToolImportMeta(toolType) {
  return TOOL_IMPORT_CONFIG[toolType] || TOOL_IMPORT_CONFIG.board
}

export function getToolImportMaxCount() {
  return MAX_IMPORT_ROWS
}

export function downloadToolImportTemplate(toolType) {
  const config = getToolImportMeta(toolType)
  const sheet = XLSX.utils.aoa_to_sheet([config.headers, ...config.example])
  sheet['!cols'] = config.headers.map(() => ({ wch: 14 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, config.sheetName)
  if (config.guide?.length) {
    const guideSheet = XLSX.utils.aoa_to_sheet(config.guide)
    guideSheet['!cols'] = [{ wch: 12 }, { wch: 72 }]
    XLSX.utils.book_append_sheet(workbook, guideSheet, '填写说明')
  }
  XLSX.writeFile(workbook, config.fileName)
}

export async function parseToolExcelFile(file, toolType, context = {}) {
  const config = getToolImportMeta(toolType)
  const validator = VALIDATORS[toolType]
  if (!validator) throw new Error('不支持的导入类型')

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel 文件中没有工作表')

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  })

  if (!matrix.length) throw new Error('Excel 文件为空')

  const headerRowIndex = matrix.findIndex((row) =>
    row.some((cell) => findColumnKey(cell, config.columns)),
  )
  if (headerRowIndex === -1) {
    throw new Error('未找到有效表头，请使用下载的模板填写')
  }

  const headers = matrix[headerRowIndex]
  const columnIndexMap = buildColumnIndexMap(headers, config.columns)
  if (columnIndexMap.name === undefined) {
    throw new Error('模板缺少名称列，请下载最新模板')
  }

  const rows = []
  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const rawRow = matrix[i]
    if (!rawRow || !rawRow.some((cell) => cellText(cell))) continue

    const cells = readRowCells(rawRow, columnIndexMap, config.columns)
    const result = validator(cells, context)
    rows.push({
      rowNumber: i + 1,
      valid: result.valid,
      errors: result.errors,
      ...result.data,
    })
  }

  if (!rows.length) throw new Error('Excel 中没有可导入的数据行')
  return rows
}

export function toToolImportPayload(row, toolType) {
  if (toolType === 'board') {
    return {
      sizeSlug: row.sizeSlug,
      data: {
        name: row.name,
        basePlate: row.basePlate,
        brand: row.brand,
        channel: row.channel,
        purchaseDate: row.purchaseDate,
        price: row.price,
        stock: row.stock,
        status: row.status,
        defectStatus: row.defectStatus,
        note: row.note,
      },
    }
  }

  return {
    name: row.name,
    material: row.material,
    style: row.style,
    spec: row.spec,
    colorStyle: row.colorStyle,
    category: row.category,
    stock: row.stock,
    brand: row.brand,
    channel: row.channel,
    purchaseDate: row.purchaseDate,
    price: row.price,
    status: row.status,
    note: row.note,
  }
}

export function formatImportPreviewValue(key, value) {
  if (value === null || value === undefined || value === '') return '-'
  if (key === 'price') {
    const num = Number(value)
    if (!Number.isFinite(num)) return '-'
    return num % 1 === 0 ? String(num) : num.toFixed(2)
  }
  return String(value)
}
