const crypto = require('crypto')
const {
  getDefaultPermissions,
  parsePermissions,
  normalizePermissionsInput,
  serializePermissions,
} = require('./permissions')

let queryAll
let queryOne
let run

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRIMARY_ADMIN_USERNAME = 'admin'
const PRIMARY_ADMIN_PASSWORD = '123456'

function isPrimaryAdminUser(user) {
  return String(user?.username || '').trim() === PRIMARY_ADMIN_USERNAME
}

function bindDb(helpers) {
  queryAll = helpers.queryAll
  queryOne = helpers.queryOne
  run = helpers.run
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex')
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return {
    salt,
    passwordHash: hashPassword(password, salt),
  }
}

function verifyPassword(password, salt, passwordHash) {
  return hashPassword(password, salt) === passwordHash
}

function rowToUser(row, { includePassword = false } = {}) {
  if (!row) return null
  const user = {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    role: row.role,
    status: row.status === 1,
    createdAt: row.created_at,
    permissions:
      row.username === PRIMARY_ADMIN_USERNAME
        ? []
        : parsePermissions(row.permissions),
  }
  if (includePassword) {
    user.password = row.password_plain || ''
  }
  return user
}

function ensurePasswordPlainColumn() {
  const columns = queryAll('PRAGMA table_info(users)')
  if (!columns.some((col) => col.name === 'password_plain')) {
    run(`ALTER TABLE users ADD COLUMN password_plain TEXT DEFAULT ''`)
    console.log('[auth] added password_plain column')
  }

  run(
    `UPDATE users SET password_plain = ? WHERE username = ? AND (password_plain IS NULL OR password_plain = '')`,
    [PRIMARY_ADMIN_PASSWORD, PRIMARY_ADMIN_USERNAME]
  )
}

function ensurePermissionsColumn() {
  const columns = queryAll('PRAGMA table_info(users)')
  if (!columns.some((col) => col.name === 'permissions')) {
    run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT ''`)
    console.log('[auth] added permissions column')
  }

  const defaultJson = serializePermissions(getDefaultPermissions())
  run(
    `
      UPDATE users
      SET permissions = ?
      WHERE username != ?
        AND (permissions IS NULL OR permissions = '' OR permissions = '[]')
    `,
    [defaultJson, PRIMARY_ADMIN_USERNAME]
  )
}

function initAuthTables() {
  run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      display_name TEXT DEFAULT '',
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `)

  run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `)

  run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`)
}

function seedPrimaryAdmin() {
  const count = queryOne('SELECT COUNT(*) AS count FROM users').count
  if (count > 0) return

  const { salt, passwordHash } = createPasswordRecord(PRIMARY_ADMIN_PASSWORD)
  run(
    `
      INSERT INTO users (username, password_hash, password_salt, password_plain, role, display_name, status, created_at)
      VALUES (?, ?, ?, ?, 'super_admin', '超级管理员', 1, ?)
    `,
    [PRIMARY_ADMIN_USERNAME, passwordHash, salt, PRIMARY_ADMIN_PASSWORD, new Date().toISOString()]
  )
  console.log(`[auth] seeded primary admin: ${PRIMARY_ADMIN_USERNAME}`)
}

function ensureDefaultAdmin() {
  const row = queryOne('SELECT id FROM users WHERE username = ?', [PRIMARY_ADMIN_USERNAME])
  if (row) return

  const { salt, passwordHash } = createPasswordRecord(PRIMARY_ADMIN_PASSWORD)
  run(
    `
      INSERT INTO users (username, password_hash, password_salt, password_plain, role, display_name, status, created_at)
      VALUES (?, ?, ?, ?, 'super_admin', '超级管理员', 1, ?)
    `,
    [PRIMARY_ADMIN_USERNAME, passwordHash, salt, PRIMARY_ADMIN_PASSWORD, new Date().toISOString()]
  )
  console.log(`[auth] ensured primary admin: ${PRIMARY_ADMIN_USERNAME}`)
}

function ensurePrimaryAdminAccount() {
  run(
    `
      UPDATE users
      SET role = 'admin'
      WHERE username != ? AND role IN ('super_admin', 'bootstrap')
    `,
    [PRIMARY_ADMIN_USERNAME]
  )
  run(
    `
      UPDATE users
      SET role = 'super_admin', display_name = '超级管理员'
      WHERE username = ?
    `,
    [PRIMARY_ADMIN_USERNAME]
  )
}

function cleanupExpiredSessions() {
  run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()])
}

function createSession(userId) {
  cleanupExpiredSessions()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + TOKEN_TTL_MS
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, userId, expiresAt])
  return { token, expiresAt }
}

function getUserByToken(token) {
  if (!token) return null
  cleanupExpiredSessions()
  const row = queryOne(
    `
      SELECT u.*
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `,
    [token, Date.now()]
  )
  if (!row || row.status !== 1) return null
  return rowToUser(row)
}

function login(username, password) {
  const row = queryOne('SELECT * FROM users WHERE username = ?', [String(username || '').trim()])
  if (!row || row.status !== 1) {
    return { ok: false, message: '账号或密码错误' }
  }
  if (!verifyPassword(password, row.password_salt, row.password_hash)) {
    return { ok: false, message: '账号或密码错误' }
  }

  if (!row.password_plain) {
    run('UPDATE users SET password_plain = ? WHERE id = ?', [String(password), row.id])
  }

  const session = createSession(row.id)
  return {
    ok: true,
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user: rowToUser(row),
    },
  }
}

function logout(token) {
  if (!token) return
  run('DELETE FROM sessions WHERE token = ?', [token])
}

function listUsers() {
  return queryAll('SELECT * FROM users ORDER BY id ASC').map((row) => rowToUser(row, { includePassword: true }))
}

function getUserById(id) {
  return rowToUser(queryOne('SELECT * FROM users WHERE id = ?', [id]))
}

function getAdminUserById(id) {
  return rowToUser(queryOne('SELECT * FROM users WHERE id = ?', [id]), { includePassword: true })
}

function createUser(payload) {
  const username = String(payload.username || '').trim()
  const password = String(payload.password || '')
  const displayName = String(payload.displayName || username).trim()

  if (!username) return { ok: false, message: '请填写账号' }
  if (username === PRIMARY_ADMIN_USERNAME) {
    return { ok: false, message: '不能创建 admin 账号' }
  }
  if (password.length < 6) return { ok: false, message: '密码至少 6 位' }
  if (queryOne('SELECT id FROM users WHERE username = ?', [username])) {
    return { ok: false, message: '账号已存在' }
  }

  const { salt, passwordHash } = createPasswordRecord(password)
  const permissionsJson = serializePermissions(
    payload.permissions ?? getDefaultPermissions(),
  )
  run(
    `
      INSERT INTO users (username, password_hash, password_salt, password_plain, role, display_name, status, permissions, created_at)
      VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?)
    `,
    [
      username,
      passwordHash,
      salt,
      password,
      displayName,
      payload.status === false ? 0 : 1,
      permissionsJson,
      new Date().toISOString(),
    ]
  )

  const created = queryOne('SELECT * FROM users WHERE username = ?', [username])
  return { ok: true, data: getAdminUserById(created.id) }
}

function updateUser(id, payload, operator) {
  const existing = queryOne('SELECT * FROM users WHERE id = ?', [id])
  if (!existing) return { ok: false, message: '用户不存在' }

  const username = String(payload.username || existing.username).trim()
  const displayName = String(payload.displayName ?? existing.display_name ?? username).trim()
  const role = existing.username === PRIMARY_ADMIN_USERNAME ? 'super_admin' : 'admin'
  const status = payload.status === false ? 0 : 1

  if (!username) return { ok: false, message: '请填写账号' }
  if (existing.username !== PRIMARY_ADMIN_USERNAME && username === PRIMARY_ADMIN_USERNAME) {
    return { ok: false, message: '不能使用 admin 作为账号名' }
  }
  if (existing.username === PRIMARY_ADMIN_USERNAME && username !== PRIMARY_ADMIN_USERNAME) {
    return { ok: false, message: '不能修改 admin 账号名' }
  }

  const duplicate = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, id])
  if (duplicate) return { ok: false, message: '账号已存在' }

  if (operator?.id === id && status !== 1) {
    return { ok: false, message: '不能禁用当前登录账号' }
  }

  if (existing.username === PRIMARY_ADMIN_USERNAME && status !== 1) {
    return { ok: false, message: '不能禁用 admin 账号' }
  }

  let passwordHash = existing.password_hash
  let passwordSalt = existing.password_salt
  let passwordPlain = existing.password_plain || ''
  let permissionsJson = existing.permissions || serializePermissions(getDefaultPermissions())
  if (payload.permissions !== undefined) {
    permissionsJson = serializePermissions(payload.permissions)
  }
  if (payload.password) {
    if (String(payload.password).length < 6) {
      return { ok: false, message: '密码至少 6 位' }
    }
    const record = createPasswordRecord(payload.password)
    passwordHash = record.passwordHash
    passwordSalt = record.salt
    passwordPlain = String(payload.password)
  }

  run(
    `
      UPDATE users
      SET username = ?, password_hash = ?, password_salt = ?, password_plain = ?, role = ?, display_name = ?, status = ?, permissions = ?
      WHERE id = ?
    `,
    [username, passwordHash, passwordSalt, passwordPlain, role, displayName, status, permissionsJson, id]
  )

  return { ok: true, data: getAdminUserById(id) }
}

function changePassword(userId, currentPassword, newPassword) {
  const row = queryOne('SELECT * FROM users WHERE id = ?', [userId])
  if (!row) return { ok: false, message: '用户不存在' }
  if (!verifyPassword(currentPassword, row.password_salt, row.password_hash)) {
    return { ok: false, message: '当前密码不正确' }
  }
  if (String(newPassword).length < 6) {
    return { ok: false, message: '密码至少 6 位' }
  }

  const { salt, passwordHash } = createPasswordRecord(newPassword)
  run(
    `UPDATE users SET password_hash = ?, password_salt = ?, password_plain = ? WHERE id = ?`,
    [passwordHash, salt, String(newPassword), userId]
  )

  return { ok: true, data: true }
}

function deleteUser(id, operator) {
  const existing = queryOne('SELECT * FROM users WHERE id = ?', [id])
  if (!existing) return { ok: false, message: '用户不存在' }

  if (operator?.id === id) {
    return { ok: false, message: '不能删除当前登录账号' }
  }

  if (existing.username === PRIMARY_ADMIN_USERNAME) {
    return { ok: false, message: '不能删除 admin 账号' }
  }

  run('DELETE FROM sessions WHERE user_id = ?', [id])
  run('DELETE FROM users WHERE id = ?', [id])
  return { ok: true, data: true }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = getUserByToken(token)

  if (!user) {
    res.status(401).json({ code: 401, message: '未登录或登录已过期' })
    return
  }

  req.authUser = user
  req.authToken = token
  next()
}

function superAdminMiddleware(req, res, next) {
  if (req.authUser?.role !== 'super_admin') {
    res.status(403).json({ code: 403, message: '无权限访问' })
    return
  }
  next()
}

function userManageMiddleware(req, res, next) {
  if (isPrimaryAdminUser(req.authUser)) {
    next()
    return
  }
  res.status(403).json({ code: 403, message: '无权限访问' })
}

function initAuth() {
  initAuthTables()
  ensurePasswordPlainColumn()
  ensurePermissionsColumn()
  seedPrimaryAdmin()
  ensureDefaultAdmin()
  ensurePrimaryAdminAccount()
}

module.exports = {
  bindDb,
  initAuth,
  login,
  logout,
  getUserByToken,
  listUsers,
  getAdminUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  authMiddleware,
  superAdminMiddleware,
  userManageMiddleware,
}
