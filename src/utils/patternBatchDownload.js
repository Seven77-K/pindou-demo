import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const MEMBER_EXPORT_HEADERS = [
  '序号',
  '图纸名称',
  '图纸图片',
  '图纸作者',
  '规格',
  '图纸类别',
  '图纸类型',
  '购买人',
  '金额',
  '是否完成',
  '完成日期',
  '图纸日期',
]

const NORMAL_EXPORT_HEADERS = [
  '序号',
  '图纸名称',
  '图纸图片',
  '图纸作者',
  '规格',
  '图纸类别',
  '图纸类型',
  '购买人',
  '价格',
  '是否完成',
  '完成日期',
  '图纸日期',
]

const TYPE_LABELS = {
  free: '免费',
  paid: '付费',
  member: '会员',
}

function sanitizeFileName(name) {
  return String(name || '未命名')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || '未命名'
}

async function fetchImageBlob(url) {
  if (!url) return null
  try {
    if (url.startsWith('data:')) {
      const response = await fetch(url)
      return await response.blob()
    }
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}

function buildUniqueImageName(baseName, ext, usedNames) {
  let candidate = `${baseName}.${ext}`
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate)
    return candidate
  }
  let index = 2
  while (usedNames.has(`${baseName}_${index}.${ext}`)) {
    index += 1
  }
  candidate = `${baseName}_${index}.${ext}`
  usedNames.add(candidate)
  return candidate
}

function buildExcelBuffer(headers, rows) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  sheet['!cols'] = headers.map((header) => ({
    wch: header === '图纸图片' ? 28 : 14,
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '图纸列表')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(2) : String(value)
}

/**
 * 批量下载选中图纸：Excel 表格，可选 images 文件夹内图片
 */
export async function downloadPatternsBatchZip(
  items,
  { category = 'member', resolveImage, includeImages = true } = {},
) {
  if (!items?.length) {
    throw new Error('没有可下载的图纸')
  }

  const zip = new JSZip()
  const imageFolder = includeImages ? zip.folder('images') : null
  const usedImageNames = new Set()
  const excelRows = []
  const headers = category === 'normal' ? NORMAL_EXPORT_HEADERS : MEMBER_EXPORT_HEADERS

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    let imagePath = ''

    if (includeImages && imageFolder) {
      const imageUrl = resolveImage ? await resolveImage(item) : item.image
      if (imageUrl) {
        const blob = await fetchImageBlob(imageUrl)
        if (blob) {
          const ext = guessImageExt(imageUrl, blob)
          const fileName = buildUniqueImageName(sanitizeFileName(item.name), ext, usedImageNames)
          imageFolder.file(fileName, blob)
          imagePath = `images/${fileName}`
        }
      }
    }

    const baseRow = [
      index + 1,
      item.name || '',
      imagePath,
      item.author || '',
      item.size || '',
      item.patternCategory || '',
      TYPE_LABELS[item.type] || item.type || '',
      item.buyer || '',
    ]

    if (category === 'normal') {
      baseRow.push(formatAmount(item.price))
    } else {
      baseRow.push(formatAmount(item.valueAmount))
    }

    baseRow.push(
      item.completed ? '已完成' : '未完成',
      item.completed ? item.completedDate || '' : '',
      item.date || '',
    )
    excelRows.push(baseRow)
  }

  const excelBuffer = buildExcelBuffer(headers, excelRows)
  zip.file('图纸列表.xlsx', excelBuffer)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const tabLabel = category === 'member' ? '会员图纸' : '普通图纸'
  const fileName = `拼豆图纸-${tabLabel}-${dayjs().format('YYYYMMDD-HHmmss')}.zip`
  saveAs(zipBlob, fileName)
}

function guessImageExt(url, blob) {
  if (blob?.type) {
    if (blob.type.includes('png')) return 'png'
    if (blob.type.includes('webp')) return 'webp'
    if (blob.type.includes('gif')) return 'gif'
    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) return 'jpg'
  }
  const lower = String(url || '').toLowerCase()
  if (lower.includes('.png')) return 'png'
  if (lower.includes('.webp')) return 'webp'
  if (lower.includes('.gif')) return 'gif'
  return 'jpg'
}

/** 保存单张图纸图片到本地 */
export async function downloadPatternImage(name, imageUrl) {
  if (!imageUrl) {
    throw new Error('暂无图片可保存')
  }
  const blob = await fetchImageBlob(imageUrl)
  if (!blob) {
    throw new Error('图片下载失败')
  }
  const ext = guessImageExt(imageUrl, blob)
  const fileName = `${sanitizeFileName(name)}.${ext}`
  saveAs(blob, fileName)
}
