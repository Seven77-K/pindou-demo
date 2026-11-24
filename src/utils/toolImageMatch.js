import { findPatternByStem, nameMatchKeys, stemFromFileName } from '@/utils/patternImageMatch'

export function toolItemHasImage(item) {
  return Boolean(String(item?.image || '').trim())
}

function buildItemLookup(items) {
  const map = new Map()

  for (const item of items) {
    for (const key of nameMatchKeys(item.name)) {
      if (!map.has(key)) map.set(key, item)
    }
  }

  return map
}

/** 仅收录尚无图片的记录，同名取第一条 */
export function buildToolItemNameMap(items) {
  return buildItemLookup(items.filter((item) => !toolItemHasImage(item)))
}

export function getToolItemKey(item) {
  if (!item) return ''
  if (item.sizeSlug != null && item.id != null) return `${item.sizeSlug}-${item.id}`
  return String(item.id ?? '')
}

/** 将图片文件按文件名（不含扩展名）与尚无图片的记录名称匹配 */
export function matchImagesToToolItems(files, items) {
  const map = buildToolItemNameMap(items)
  const withImageMap = buildItemLookup(items.filter(toolItemHasImage))
  const usedItemKeys = new Set()

  return files.map((file) => {
    const stem = stemFromFileName(file.name)
    const item = findPatternByStem(stem, map)
    let status = 'matched'
    let message = '可更新'

    if (!stem) {
      status = 'error'
      message = '文件名为空'
    } else if (!item) {
      if (findPatternByStem(stem, withImageMap)) {
        status = 'skipped'
        message = '已有图片，跳过'
      } else {
        status = 'unmatched'
        message = '未找到同名记录'
      }
    } else {
      const key = getToolItemKey(item)
      if (usedItemKeys.has(key)) {
        status = 'error'
        message = '多张图片对应同一条记录'
      } else {
        usedItemKeys.add(key)
      }
    }

    return { file, stem, item: item || null, status, message }
  })
}
