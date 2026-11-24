const PERMISSION_GROUPS = [
  { key: 'home', permissions: [{ key: 'home.view' }] },
  {
    key: 'pattern',
    permissions: [
      { key: 'pattern.view' },
      { key: 'pattern.member.qinger' },
      { key: 'pattern.member.xiaolin' },
      { key: 'pattern.create' },
      { key: 'pattern.edit' },
      { key: 'pattern.delete' },
      { key: 'pattern.import' },
      { key: 'pattern.batch' },
    ],
  },
  { key: 'author', permissions: [{ key: 'author.view' }] },
  {
    key: 'tools',
    permissions: [{ key: 'tools.view' }, { key: 'tools.edit' }, { key: 'tools.delete' }],
  },
  {
    key: 'cost',
    permissions: [
      { key: 'cost.view' },
      { key: 'cost.pattern.qinger' },
      { key: 'cost.pattern.xiaolin' },
      { key: 'cost.edit' },
      { key: 'cost.delete' },
    ],
  },
  { key: 'statistics', permissions: [{ key: 'statistics.view' }] },
  { key: 'profile', permissions: [{ key: 'profile.view' }] },
]

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((item) => item.key),
)

const DEFAULT_MEMBER_BUYER_PERMISSION_KEYS = [
  'pattern.member.qinger',
  'pattern.member.xiaolin',
]

const COST_PATTERN_BUYER_PERMISSION_KEYS = [
  'cost.pattern.qinger',
  'cost.pattern.xiaolin',
]

function normalizeExclusiveBuyerGroup(list, exclusiveKeys, anchorPermission, defaultKey) {
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

function normalizeAccountPermissions(list) {
  const normalized = normalizePermissionsInput(list)
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

function getDefaultPermissions() {
  return normalizeAccountPermissions([...ALL_PERMISSION_KEYS])
}

function normalizePermissionsInput(list) {
  if (!Array.isArray(list)) return getDefaultPermissions()
  const allowed = new Set(ALL_PERMISSION_KEYS)
  const normalized = [...new Set(list.filter((key) => allowed.has(key)))]
  return normalized.length ? normalized : getDefaultPermissions()
}

function parsePermissions(raw) {
  if (!raw) return getDefaultPermissions()
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return getDefaultPermissions()
    return normalizeAccountPermissions(list)
  } catch {
    return getDefaultPermissions()
  }
}

function serializePermissions(list) {
  return JSON.stringify(normalizeAccountPermissions(list))
}

module.exports = {
  ALL_PERMISSION_KEYS,
  getDefaultPermissions,
  parsePermissions,
  normalizePermissionsInput,
  serializePermissions,
}
