/** 权限配置：新增功能时在此追加即可 */
export const PERMISSION_GROUPS = [
  {
    key: 'home',
    label: '首页',
    permissions: [{ key: 'home.view', label: '查看' }],
  },
  {
    key: 'pattern',
    label: '拼豆图纸',
    permissions: [
      { key: 'pattern.view', label: '查看' },
      { key: 'pattern.member.qinger', label: '默认购买人-晴儿' },
      { key: 'pattern.member.xiaolin', label: '默认购买人-小琳' },
      { key: 'pattern.create', label: '上传' },
      { key: 'pattern.edit', label: '编辑' },
      { key: 'pattern.delete', label: '删除' },
      { key: 'pattern.import', label: 'Excel 导入' },
      { key: 'pattern.batch', label: '批量操作' },
    ],
  },
  {
    key: 'author',
    label: '图纸作者',
    permissions: [{ key: 'author.view', label: '查看' }],
  },
  {
    key: 'tools',
    label: '拼豆工具',
    permissions: [
      { key: 'tools.view', label: '查看' },
      { key: 'tools.edit', label: '新增/编辑' },
      { key: 'tools.delete', label: '删除' },
    ],
  },
  {
    key: 'cost',
    label: '拼豆花费',
    permissions: [
      { key: 'cost.view', label: '查看' },
      { key: 'cost.edit', label: '记一笔/编辑' },
      { key: 'cost.delete', label: '删除' },
    ],
  },
  {
    key: 'statistics',
    label: '数据统计',
    permissions: [{ key: 'statistics.view', label: '查看' }],
  },
  {
    key: 'profile',
    label: '个人信息',
    permissions: [{ key: 'profile.view', label: '查看/修改' }],
  },
]

export const ROUTE_PERMISSION_MAP = {
  home: 'home.view',
  pattern: 'pattern.view',
  author: 'author.view',
  tools: 'tools.view',
  'tools-board': 'tools.view',
  'tools-pen': 'tools.view',
  'tools-scoop': 'tools.view',
  'tools-other': 'tools.view',
  cost: 'cost.view',
  'cost-review': 'cost.view',
  statistics: 'statistics.view',
  profile: 'profile.view',
}

export const MEMBER_BUYERS = [
  { name: '晴儿', permission: 'pattern.member.qinger' },
  { name: '小琳', permission: 'pattern.member.xiaolin' },
]

export const DEFAULT_MEMBER_BUYER_PERMISSION_KEYS = MEMBER_BUYERS.map(
  (item) => item.permission,
)

export const COST_PATTERN_BUYERS = [
  { name: '晴儿', permission: 'cost.pattern.qinger' },
  { name: '小琳', permission: 'cost.pattern.xiaolin' },
]

export const COST_PATTERN_BUYER_PERMISSION_KEYS = COST_PATTERN_BUYERS.map(
  (item) => item.permission,
)

export const ALL_PERMISSION_KEYS = [
  ...PERMISSION_GROUPS.flatMap((group) => group.permissions.map((item) => item.key)),
  ...COST_PATTERN_BUYER_PERMISSION_KEYS,
]

function normalizeExclusiveBuyerGroup(
  list,
  exclusiveKeys,
  anchorPermission,
  defaultKey,
) {
  let result = list
  const picked = exclusiveKeys.filter((key) => result.includes(key))
  if (picked.length > 1) {
    const keep = picked[0]
    result = result.filter((key) => !exclusiveKeys.includes(key) || key === keep)
  }
  if (result.includes(anchorPermission) && !exclusiveKeys.some((key) => result.includes(key))) {
    result = [...result, defaultKey]
  }
  return result
}

export function normalizeAccountPermissions(list) {
  const normalized = normalizePermissions(list)
  let result = normalizeExclusiveBuyerGroup(
    normalized,
    DEFAULT_MEMBER_BUYER_PERMISSION_KEYS,
    'pattern.view',
    DEFAULT_MEMBER_BUYER_PERMISSION_KEYS[0],
  )
  result = normalizeExclusiveBuyerGroup(
    result,
    COST_PATTERN_BUYER_PERMISSION_KEYS,
    'cost.view',
    COST_PATTERN_BUYER_PERMISSION_KEYS[0],
  )
  return result
}

/** @deprecated 使用 normalizeAccountPermissions */
export function normalizeMemberBuyerPermissions(list) {
  return normalizeAccountPermissions(list)
}

export function normalizePermissions(list) {
  if (!Array.isArray(list)) return []
  const allowed = new Set(ALL_PERMISSION_KEYS)
  return [...new Set(list.filter((key) => allowed.has(key)))]
}

export function getDefaultPermissions() {
  return normalizeAccountPermissions([...ALL_PERMISSION_KEYS])
}

export function hasPermission(user, permissionKey) {
  if (!permissionKey) return true
  const list = user?.permissions
  if (!Array.isArray(list) || !list.length) return true
  return list.includes(permissionKey)
}

export function getDefaultMemberBuyer(user) {
  const list = user?.permissions
  if (Array.isArray(list) && list.length) {
    const hit = MEMBER_BUYERS.find((item) => list.includes(item.permission))
    if (hit) return hit.name
  }
  return MEMBER_BUYERS[0].name
}

export function getCostPatternBuyerName(user) {
  const list = user?.permissions
  if (Array.isArray(list) && list.length) {
    const hit = COST_PATTERN_BUYERS.find((item) => list.includes(item.permission))
    if (hit) return hit.name
  }
  return ''
}

export function getPermissionLabel(key) {
  for (const group of PERMISSION_GROUPS) {
    const hit = group.permissions.find((item) => item.key === key)
    if (hit) return hit.label
  }
  const costHit = COST_PATTERN_BUYERS.find((item) => item.permission === key)
  if (costHit) return `普通图纸金额-${costHit.name}`
  return key
}

export function summarizePermissions(permissions) {
  const list = normalizePermissions(permissions)
  if (!list.length || list.length >= ALL_PERMISSION_KEYS.length) {
    return '全部功能'
  }
  return `已选 ${list.length} 项`
}
