const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')
const seedData = require('./seed-data')
const { persistDataUrl, prepareImageForStorage } = require('./imageStore')

const dbPath = path.join(__dirname, 'db.sqlite')
let db = null
let summaryCache = null

const rowToPattern = (row, { includeImage = true } = {}) => {
  const pattern = {
    id: row.id,
    name: row.name,
    author: row.author,
    size: row.size,
    type: row.type,
    patternCategory: row.pattern_category || '',
    buyer: row.buyer,
    price: row.price ?? null,
    valueAmount: row.value_amount ?? null,
    completed: false,
    completedDate: '',
    isRepeat: false,
    reassembleDates: [],
    date: row.date,
  }

  if (includeImage) {
    pattern.image = row.image || ''
    pattern.hasImage = Boolean(row.has_image ?? (row.image && String(row.image).trim()))
  } else {
    pattern.image = ''
    pattern.hasImage = Boolean(row.has_image)
  }

  return pattern
}

function invalidateSummaryCache() {
  summaryCache = null
}

function persist() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  invalidateSummaryCache()
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows[0] || null
}

function run(sql, params = []) {
  db.run(sql, params)
  persist()
}

function seedIfEmpty() {
  const count = queryOne('SELECT COUNT(*) AS count FROM patterns').count
  if (count > 0) return

  const insert = `
    INSERT INTO patterns (id, category, name, image, has_image, author, size, type, pattern_category, buyer, completed, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const insertItems = (items, category) => {
    items.forEach((item) => {
      const imageInfo = prepareImageForStorage(item.image || '')
      db.run(insert, [
        item.id,
        category,
        item.name,
        imageInfo.image,
        imageInfo.hasImage,
        item.author || '',
        item.size || '',
        item.type,
        item.patternCategory || '',
        item.buyer || '',
        item.completed ? 1 : 0,
        item.date || '',
      ])
    })
  }

  insertItems(seedData.member, 'member')
  insertItems(seedData.normal, 'normal')
  persist()
  console.log('[db] seeded initial pattern data')
}

function ensurePatternCategoryColumn() {
  const columns = queryAll('PRAGMA table_info(patterns)')
  if (!columns.some((col) => col.name === 'pattern_category')) {
    db.run(`ALTER TABLE patterns ADD COLUMN pattern_category TEXT DEFAULT ''`)
    persist()
    console.log('[db] added pattern_category column')
  }
}

function ensureHasImageColumn() {
  const columns = queryAll('PRAGMA table_info(patterns)')
  if (!columns.some((col) => col.name === 'has_image')) {
    db.run(`ALTER TABLE patterns ADD COLUMN has_image INTEGER NOT NULL DEFAULT 0`)
    db.run(
      `UPDATE patterns SET has_image = CASE WHEN image IS NOT NULL AND image != '' THEN 1 ELSE 0 END`
    )
    persist()
    console.log('[db] added has_image column')
  }
}

function ensurePriceColumn() {
  const columns = queryAll('PRAGMA table_info(patterns)')
  if (!columns.some((col) => col.name === 'price')) {
    db.run(`ALTER TABLE patterns ADD COLUMN price REAL`)
    persist()
    console.log('[db] added price column')
  }
}

function ensureValueAmountColumn() {
  const columns = queryAll('PRAGMA table_info(patterns)')
  if (!columns.some((col) => col.name === 'value_amount')) {
    db.run(`ALTER TABLE patterns ADD COLUMN value_amount REAL`)
    persist()
    console.log('[db] added value_amount column')
  }
}

function ensureCategoryIndex() {
  db.run(`CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category)`)
}

function migrateInlineImagesToFiles() {
  const rows = queryAll(`SELECT id, image FROM patterns WHERE has_image = 1`)
  let changed = 0

  rows.forEach((row) => {
    const image = row.image || ''
    if (!image.startsWith('data:image/')) return
    const stored = persistDataUrl(image)
    if (stored && stored !== image) {
      db.run('UPDATE patterns SET image = ? WHERE id = ?', [stored, row.id])
      changed += 1
    }
  })

  if (changed) {
    db.run('VACUUM')
    persist()
    console.log(`[db] migrated ${changed} inline images to upload files and compacted database`)
  }
}

function optimizeDatabaseIfNeeded() {
  if (!fs.existsSync(dbPath)) return

  const sizeMb = fs.statSync(dbPath).size / (1024 * 1024)
  if (sizeMb < 20) return

  const inlineCount = queryOne(
    `SELECT COUNT(*) AS count FROM patterns WHERE image LIKE 'data:image/%'`
  ).count
  if (inlineCount > 0) return

  console.log(`[db] compacting database (${sizeMb.toFixed(1)} MB)...`)
  db.run('VACUUM')
  persist()
  const afterMb = fs.statSync(dbPath).size / (1024 * 1024)
  console.log(`[db] compacted to ${afterMb.toFixed(1)} MB`)
}

function ensureUserPatternCompletedTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS pattern_user_completed (
      user_id INTEGER NOT NULL,
      pattern_id TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_date TEXT NOT NULL DEFAULT '',
      is_repeat INTEGER NOT NULL DEFAULT 0,
      reassemble_dates TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, pattern_id)
    )
  `)
  ensureCompletedDateColumn()
  ensureRepeatColumns()
}

function ensureCompletedDateColumn() {
  const columns = queryAll('PRAGMA table_info(pattern_user_completed)')
  if (!columns.some((col) => col.name === 'completed_date')) {
    db.run(`ALTER TABLE pattern_user_completed ADD COLUMN completed_date TEXT NOT NULL DEFAULT ''`)
    persist()
    console.log('[db] added completed_date column to pattern_user_completed')
  }
}

function ensureRepeatColumns() {
  const columns = queryAll('PRAGMA table_info(pattern_user_completed)')
  if (!columns.some((col) => col.name === 'is_repeat')) {
    db.run(`ALTER TABLE pattern_user_completed ADD COLUMN is_repeat INTEGER NOT NULL DEFAULT 0`)
    persist()
    console.log('[db] added is_repeat column to pattern_user_completed')
  }
  if (!columns.some((col) => col.name === 'reassemble_dates')) {
    db.run(`ALTER TABLE pattern_user_completed ADD COLUMN reassemble_dates TEXT NOT NULL DEFAULT '[]'`)
    persist()
    console.log('[db] added reassemble_dates column to pattern_user_completed')
  }
}

function todayDateString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeCompletedDate(value) {
  return String(value || '')
    .trim()
    .slice(0, 10)
}

function normalizeReassembleDates(value) {
  let list = []
  if (Array.isArray(value)) {
    list = value
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      list = Array.isArray(parsed) ? parsed : []
    } catch {
      list = value
        .split(/[,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return [...new Set(list.map((item) => normalizeCompletedDate(item)).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a),
  )
}

function emptyUserPatternOverlay() {
  return {
    completed: false,
    completedDate: '',
    isRepeat: false,
    reassembleDates: [],
  }
}

function overlayFromCompletedRow(row) {
  if (!row) return emptyUserPatternOverlay()
  const isRepeat = Boolean(row.is_repeat)
  return {
    completed: Boolean(row.completed),
    completedDate: row.completed ? row.completed_date || '' : '',
    isRepeat,
    reassembleDates: isRepeat ? normalizeReassembleDates(row.reassemble_dates) : [],
  }
}

function ensureAppMetaTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)
}

function ensureAuthorAmountsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS author_amounts (
      author TEXT NOT NULL,
      buyer TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (author, buyer)
    )
  `)
}

function buildAuthorAmountKey(author, buyer) {
  return `${String(author || '').trim()}::${String(buyer || '').trim()}`
}

function getAllAuthorAmounts() {
  const rows = queryAll(
    `SELECT author, buyer, amount, date FROM author_amounts WHERE amount > 0 ORDER BY author, buyer`
  )
  return rows.map((row) => ({
    author: row.author,
    buyer: row.buyer || '',
    amount: row.amount ?? 0,
    date: row.date || '',
    key: buildAuthorAmountKey(row.author, row.buyer),
  }))
}

function normalizeAuthorAmountValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.round(num * 100) / 100
}

function upsertAuthorAmount(author, buyer, amount, date) {
  const normalizedAuthor = String(author || '').trim()
  const normalizedBuyer = String(buyer || '').trim()
  const normalizedAmount = normalizeAuthorAmountValue(amount)
  const normalizedDate = String(date || '').trim().slice(0, 10)

  if (!normalizedAuthor) {
    throw new Error('请填写作者名称')
  }

  if (normalizedAmount <= 0) {
    run('DELETE FROM author_amounts WHERE author = ? AND buyer = ?', [
      normalizedAuthor,
      normalizedBuyer,
    ])
    return null
  }

  const now = new Date().toISOString()
  run(
    `
      INSERT INTO author_amounts (author, buyer, amount, date, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(author, buyer) DO UPDATE SET
        amount = excluded.amount,
        date = excluded.date,
        updated_at = excluded.updated_at
    `,
    [normalizedAuthor, normalizedBuyer, normalizedAmount, normalizedDate || now.slice(0, 10), now]
  )

  return {
    author: normalizedAuthor,
    buyer: normalizedBuyer,
    amount: normalizedAmount,
    date: normalizedDate || now.slice(0, 10),
    key: buildAuthorAmountKey(normalizedAuthor, normalizedBuyer),
  }
}

function countMemberPatternsByAuthor(author) {
  const normalizedAuthor = String(author || '').trim()
  if (!normalizedAuthor) return 0
  const row = queryOne(
    `SELECT COUNT(*) AS count FROM patterns WHERE category = 'member' AND author = ?`,
    [normalizedAuthor],
  )
  return row?.count || 0
}

function deleteAuthorAmount(author, buyer) {
  const normalizedAuthor = String(author || '').trim()
  const normalizedBuyer = String(buyer || '').trim()
  if (!normalizedAuthor) return false
  if (countMemberPatternsByAuthor(normalizedAuthor) > 0) {
    throw new Error('该作者已有会员图纸，无法删除')
  }
  run('DELETE FROM author_amounts WHERE author = ? AND buyer = ?', [
    normalizedAuthor,
    normalizedBuyer,
  ])
  return true
}

function renameAuthor(oldName, newName) {
  const from = String(oldName || '').trim()
  const to = String(newName || '').trim()

  if (!from) {
    throw new Error('原作者名称不能为空')
  }
  if (!to) {
    throw new Error('请填写作者名称')
  }
  if (from === to) {
    return { from, to, updatedPatterns: 0, renamedAmounts: 0 }
  }

  const patternCount =
    queryOne('SELECT COUNT(*) AS count FROM patterns WHERE author = ?', [from])?.count || 0

  run('UPDATE patterns SET author = ? WHERE author = ?', [to, from])

  const amountRows = queryAll(
    'SELECT author, buyer, amount, date FROM author_amounts WHERE author = ?',
    [from],
  )
  const now = new Date().toISOString()
  let renamedAmounts = 0

  amountRows.forEach((row) => {
    const buyer = row.buyer || ''
    const existing = queryOne(
      'SELECT author, buyer, amount, date FROM author_amounts WHERE author = ? AND buyer = ?',
      [to, buyer],
    )

    if (!existing) {
      run(
        `
          INSERT INTO author_amounts (author, buyer, amount, date, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        [to, buyer, row.amount ?? 0, row.date || '', now],
      )
    } else {
      const mergedAmount =
        normalizeAuthorAmountValue(existing.amount) + normalizeAuthorAmountValue(row.amount)
      const dateA = String(existing.date || '').trim().slice(0, 10)
      const dateB = String(row.date || '').trim().slice(0, 10)
      const mergedDate = !dateA ? dateB : !dateB ? dateA : dateA <= dateB ? dateA : dateB
      run(
        `
          UPDATE author_amounts
          SET amount = ?, date = ?, updated_at = ?
          WHERE author = ? AND buyer = ?
        `,
        [mergedAmount, mergedDate, now, to, buyer],
      )
    }

    run('DELETE FROM author_amounts WHERE author = ? AND buyer = ?', [from, buyer])
    renamedAmounts += 1
  })

  return {
    from,
    to,
    updatedPatterns: patternCount,
    renamedAmounts,
  }
}

function undoSeedRestoreCompleted() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'pattern_completed_undo_seed_restore_v1'`)
  if (row) return

  const seedItems = [...seedData.member, ...seedData.normal]
  let fixed = 0

  seedItems.forEach((item) => {
    const existing = queryOne('SELECT name, completed FROM patterns WHERE id = ?', [item.id])
    if (!existing) return
    if (existing.name !== item.name && existing.completed) {
      db.run('UPDATE patterns SET completed = 0 WHERE id = ?', [item.id])
      fixed += 1
    }
  })

  db.run(`INSERT INTO app_meta (key, value) VALUES ('pattern_completed_undo_seed_restore_v1', '1')`)
  persist()
  console.log(`[db] cleared ${fixed} wrongly restored completed flags on repurposed seed IDs`)
}

function migrateMasterCompletedToPerUser() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'pattern_completed_per_user_v1'`)
  if (row) return

  const superAdmin = queryOne(`SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1`)
  if (!superAdmin) {
    db.run('UPDATE patterns SET completed = 0')
    db.run(`INSERT INTO app_meta (key, value) VALUES ('pattern_completed_per_user_v1', '1')`)
    persist()
    return
  }

  const otherUserCompleted = new Set(
    queryAll(
      `
        SELECT pattern_id
        FROM pattern_user_completed
        WHERE user_id != ? AND completed = 1
      `,
      [superAdmin.id]
    ).map((item) => item.pattern_id)
  )

  const completedRows = queryAll('SELECT id FROM patterns WHERE completed = 1')
  let migrated = 0

  completedRows.forEach((patternRow) => {
    if (otherUserCompleted.has(patternRow.id)) return
    db.run(
      `
        INSERT INTO pattern_user_completed (user_id, pattern_id, completed)
        VALUES (?, ?, 1)
        ON CONFLICT(user_id, pattern_id) DO UPDATE SET completed = 1
      `,
      [superAdmin.id, patternRow.id]
    )
    migrated += 1
  })

  db.run('UPDATE patterns SET completed = 0')
  db.run(`INSERT INTO app_meta (key, value) VALUES ('pattern_completed_per_user_v1', '1')`)
  persist()
  console.log(`[db] migrated ${migrated} master completed flags to super admin per-user storage`)
}

const XIAOLIN_MEMBER_TO_NORMAL_IDS = ['HY060', 'HY126', 'HY338', 'HY523']

function migrateXiaolinMemberPatternsToNormal() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'xiaolin_member_to_normal_v1'`)
  if (row) return

  let moved = 0
  XIAOLIN_MEMBER_TO_NORMAL_IDS.forEach((oldId) => {
    const existing = getById(oldId)
    if (!existing || existing.category !== 'member') return

    const newId = nextPatternId('normal')
    db.run(
      `
        INSERT INTO patterns (
          id, category, name, image, has_image, author, size, type,
          pattern_category, buyer, completed, date
        ) VALUES (?, 'normal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        newId,
        existing.name,
        existing.image || '',
        existing.has_image ?? 0,
        existing.author || '',
        existing.size || '',
        existing.type,
        existing.pattern_category || '',
        existing.buyer || '',
        existing.completed ?? 0,
        existing.date || '',
      ]
    )

    queryAll(
      'SELECT user_id, completed, completed_date FROM pattern_user_completed WHERE pattern_id = ?',
      [oldId]
    ).forEach((item) => {
      db.run(
        `
          INSERT INTO pattern_user_completed (user_id, pattern_id, completed, completed_date)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, pattern_id) DO UPDATE SET
            completed = excluded.completed,
            completed_date = excluded.completed_date
        `,
        [item.user_id, newId, item.completed, item.completed_date || '']
      )
    })

    db.run('DELETE FROM pattern_user_completed WHERE pattern_id = ?', [oldId])
    db.run('DELETE FROM patterns WHERE id = ?', [oldId])
    moved += 1
    console.log(`[db] moved member pattern ${oldId} (${existing.name}) -> ${newId}`)
  })

  db.run(`INSERT INTO app_meta (key, value) VALUES ('xiaolin_member_to_normal_v1', '1')`)
  if (moved > 0) {
    persist()
    console.log(`[db] migrated ${moved} 小琳 member patterns to normal`)
  }
}

function migrateMemberPaidValueAmountToDefault() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'member_value_amount_default_v1'`)
  if (row) return

  db.run(
    `
      UPDATE patterns
      SET value_amount = 3
      WHERE category = 'member' AND type IN ('paid', 'member')
    `
  )
  db.run(`INSERT INTO app_meta (key, value) VALUES ('member_value_amount_default_v1', '1')`)
  persist()
  console.log('[db] set member paid/member pattern value_amount to 3')
}

function normalizeCompleted(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false' || value === '' || value == null) {
    return false
  }
  return Boolean(value)
}

function applyUserCompleted(pattern, user) {
  if (!user?.id) return { ...pattern, ...emptyUserPatternOverlay() }
  const row = queryOne(
    `SELECT completed, completed_date, is_repeat, reassemble_dates
     FROM pattern_user_completed WHERE user_id = ? AND pattern_id = ?`,
    [user.id, pattern.id],
  )
  return {
    ...pattern,
    ...overlayFromCompletedRow(row),
  }
}

function applyUserCompletedList(list, user) {
  if (!user?.id) {
    return list.map((pattern) => ({ ...pattern, ...emptyUserPatternOverlay() }))
  }
  const userMap = getUserCompletedMap(user.id)
  return list.map((pattern) => {
    const overlay = userMap[pattern.id] || emptyUserPatternOverlay()
    return {
      ...pattern,
      ...overlay,
    }
  })
}

function getUserCompletedMap(userId) {
  const rows = queryAll(
    `SELECT pattern_id, completed, completed_date, is_repeat, reassemble_dates
     FROM pattern_user_completed WHERE user_id = ?`,
    [userId],
  )
  return Object.fromEntries(
    rows.map((row) => [row.pattern_id, overlayFromCompletedRow(row)]),
  )
}

function setUserPatternCompleted(userId, patternId, completed, completedDate, extra = {}) {
  const isCompleted = Boolean(completed)
  const date = isCompleted
    ? normalizeCompletedDate(completedDate) || todayDateString()
    : ''
  const isRepeat = Boolean(extra.isRepeat)
  const reassembleDates = isRepeat ? normalizeReassembleDates(extra.reassembleDates) : []
  db.run(
    `
      INSERT INTO pattern_user_completed (
        user_id, pattern_id, completed, completed_date, is_repeat, reassemble_dates
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, pattern_id) DO UPDATE SET
        completed = excluded.completed,
        completed_date = excluded.completed_date,
        is_repeat = excluded.is_repeat,
        reassemble_dates = excluded.reassemble_dates
    `,
    [
      userId,
      patternId,
      isCompleted ? 1 : 0,
      date,
      isRepeat ? 1 : 0,
      JSON.stringify(reassembleDates),
    ],
  )
  invalidateSummaryCache()
  persist()
}

async function initDb() {
  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('member', 'normal')),
      name TEXT NOT NULL,
      image TEXT DEFAULT '',
      has_image INTEGER NOT NULL DEFAULT 0,
      author TEXT DEFAULT '',
      size TEXT DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('free', 'paid', 'member')),
      buyer TEXT DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      date TEXT DEFAULT ''
    )
  `)

  ensurePatternCategoryColumn()
  ensureHasImageColumn()
  ensurePriceColumn()
  ensureValueAmountColumn()
  ensureCategoryIndex()
  ensureUserPatternCompletedTable()
  ensureAuthorAmountsTable()
  seedIfEmpty()
  undoSeedRestoreCompleted()
  migrateInlineImagesToFiles()
  optimizeDatabaseIfNeeded()

  const auth = require('./auth')
  auth.bindDb({ queryAll, queryOne, run })
  auth.initAuth()
  migrateMasterCompletedToPerUser()
  migrateXiaolinMemberPatternsToNormal()
  migrateMemberPaidValueAmount()
  migrateMemberTypeValueAmountBySize()
  migrateMemberTypeValueAmountBySizeV3()
  migrateMemberTypeValueAmountByAuthorPaidV4()
  migrateMemberTypeValueAmountMin3V5()
  backfillEmptyPatternBuyers()
}

function migrateMemberPaidValueAmount() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'member_paid_value_amount_v1'`)
  if (row) return

  db.run(`
    UPDATE patterns
    SET value_amount = 3
    WHERE category = 'member' AND type IN ('paid', 'member')
  `)
  db.run(`INSERT INTO app_meta (key, value) VALUES ('member_paid_value_amount_v1', '1')`)
  persist()
  console.log('[db] set value_amount=3 for member/paid member patterns')
}

function migrateMemberTypeValueAmountBySize() {
  ensureAppMetaTable()
  // v2：金额 >3 视为手填保留；仅对空或 ≤3（旧默认）按规格重算
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'member_type_value_amount_by_size_v2'`)
  if (row) return

  const patterns = queryAll(
    `
      SELECT id, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'member'
        AND (value_amount IS NULL OR value_amount <= 3)
    `
  )
  patterns.forEach((pattern) => {
    const amount = getMemberValueAmountBySize(pattern.size)
    db.run('UPDATE patterns SET value_amount = ? WHERE id = ?', [amount, pattern.id])
  })
  db.run(`INSERT INTO app_meta (key, value) VALUES ('member_type_value_amount_by_size_v2', '1')`)
  persist()
  console.log(
    `[db] updated ${patterns.length} member-type patterns value_amount by size (kept custom >3)`
  )
}

/** v3：新档位 ≤140/160/180/200；仅重算旧默认档位金额，手填自定义金额保留 */
function migrateMemberTypeValueAmountBySizeV3() {
  ensureAppMetaTable()
  const row = queryOne(`SELECT value FROM app_meta WHERE key = 'member_type_value_amount_by_size_v3'`)
  if (row) return

  const defaultAmounts = new Set([3, 5, 8, 8.8, 9.9])
  const patterns = queryAll(
    `
      SELECT id, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'member'
    `
  )
  let updated = 0
  patterns.forEach((pattern) => {
    const current = pattern.value_amount
    if (current != null && !defaultAmounts.has(Number(current))) return
    const amount = getMemberValueAmountBySize(pattern.size)
    if (Number(current) === amount) return
    db.run('UPDATE patterns SET value_amount = ? WHERE id = ?', [amount, pattern.id])
    updated += 1
  })
  db.run(`INSERT INTO app_meta (key, value) VALUES ('member_type_value_amount_by_size_v3', '1')`)
  if (updated > 0) persist()
  console.log(`[db] v3 size tiers: updated ${updated} member-type pattern amounts`)
}

/**
 * v4：会员类型金额按该作者付费图纸规格价格重算（只改 type=member，不动付费）
 * 作者无付费样本时保持全局规格档位
 */
function migrateMemberTypeValueAmountByAuthorPaidV4() {
  ensureAppMetaTable()
  const row = queryOne(
    `SELECT value FROM app_meta WHERE key = 'member_type_value_amount_by_author_paid_v4'`,
  )
  if (row) return

  const paidRows = queryAll(
    `
      SELECT author, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'paid'
        AND value_amount IS NOT NULL
        AND value_amount > 0
    `,
  )
  const paidByAuthor = new Map()
  paidRows.forEach((item) => {
    const author = String(item.author || '').trim()
    if (!author) return
    if (!paidByAuthor.has(author)) paidByAuthor.set(author, [])
    paidByAuthor.get(author).push({
      size: item.size,
      amount: item.value_amount,
    })
  })

  const patterns = queryAll(
    `
      SELECT id, author, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'member'
    `,
  )
  let updated = 0
  patterns.forEach((pattern) => {
    const author = String(pattern.author || '').trim()
    const paidRefs = paidByAuthor.get(author) || []
    const raw =
      resolveAmountFromAuthorPaid(pattern.size, paidRefs) ??
      getMemberValueAmountBySize(pattern.size)
    const amount = applyMemberTypeMinAmount(raw)
    if (Number(pattern.value_amount) === amount) return
    db.run('UPDATE patterns SET value_amount = ? WHERE id = ?', [amount, pattern.id])
    updated += 1
  })

  db.run(
    `INSERT INTO app_meta (key, value) VALUES ('member_type_value_amount_by_author_paid_v4', '1')`,
  )
  if (updated > 0) persist()
  console.log(
    `[db] v4 author-paid pricing: updated ${updated} member-type pattern amounts`,
  )
}

/** v5：会员类型金额最低 3；把已按付费逻辑算成低于 3 的补到下限 */
function migrateMemberTypeValueAmountMin3V5() {
  ensureAppMetaTable()
  const row = queryOne(
    `SELECT value FROM app_meta WHERE key = 'member_type_value_amount_min_3_v5'`,
  )
  if (row) return

  const paidRows = queryAll(
    `
      SELECT author, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'paid'
        AND value_amount IS NOT NULL
        AND value_amount > 0
    `,
  )
  const paidByAuthor = new Map()
  paidRows.forEach((item) => {
    const author = String(item.author || '').trim()
    if (!author) return
    if (!paidByAuthor.has(author)) paidByAuthor.set(author, [])
    paidByAuthor.get(author).push({
      size: item.size,
      amount: item.value_amount,
    })
  })

  const patterns = queryAll(
    `
      SELECT id, author, size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'member'
    `,
  )
  let updated = 0
  patterns.forEach((pattern) => {
    const author = String(pattern.author || '').trim()
    const paidRefs = paidByAuthor.get(author) || []
    const raw =
      resolveAmountFromAuthorPaid(pattern.size, paidRefs) ??
      getMemberValueAmountBySize(pattern.size)
    const amount = applyMemberTypeMinAmount(raw)
    if (Number(pattern.value_amount) === amount) return
    db.run('UPDATE patterns SET value_amount = ? WHERE id = ?', [amount, pattern.id])
    updated += 1
  })

  db.run(
    `INSERT INTO app_meta (key, value) VALUES ('member_type_value_amount_min_3_v5', '1')`,
  )
  if (updated > 0) persist()
  console.log(`[db] v5 member min 3: updated ${updated} member-type pattern amounts`)
}

function rowToSummaryPattern(row) {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    size: row.size,
    type: row.type,
    patternCategory: row.pattern_category || '',
    buyer: row.buyer,
    price: row.price ?? null,
    valueAmount: row.value_amount ?? null,
    completed: false,
    completedDate: '',
    isRepeat: false,
    reassembleDates: [],
    date: row.date,
    image: '',
    hasImage: Boolean(row.has_image),
  }
}

function getBasePatternLists() {
  const listByCategory = (category) =>
    queryAll(
      `
        SELECT id, name, author, size, type, pattern_category, buyer, price, value_amount, completed, date, has_image
        FROM patterns
        WHERE category = ?
        ORDER BY date DESC, id DESC
      `,
      [category]
    ).map(rowToSummaryPattern)

  if (!summaryCache) {
    summaryCache = {
      member: listByCategory('member'),
      normal: listByCategory('normal'),
    }
  }

  return summaryCache
}

function getAllPatterns({ includeImages = false, user } = {}) {
  const base = getBasePatternLists()

  return {
    member: applyUserCompletedList(base.member, user),
    normal: applyUserCompletedList(base.normal, user),
  }
}

function getPatternById(id, user) {
  const row = getById(id)
  if (!row) return null
  return applyUserCompleted(rowToPattern(row, { includeImage: true }), user)
}

function getPatternImageById(id) {
  const row = queryOne('SELECT image FROM patterns WHERE id = ? AND has_image = 1', [id])
  return row?.image || ''
}

function getById(id) {
  return queryOne(
    `
      SELECT id, category, name, image, has_image, author, size, type, pattern_category, buyer, price, value_amount, completed, date
      FROM patterns
      WHERE id = ?
    `,
    [id]
  )
}

function resolvePatternCategory(data, existing) {
  if (data.patternCategory !== undefined && data.patternCategory !== null) {
    return String(data.patternCategory).trim()
  }
  if (data.pattern_category !== undefined && data.pattern_category !== null) {
    return String(data.pattern_category).trim()
  }
  return existing?.pattern_category || existing?.patternCategory || ''
}

function normalizePrice(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return Math.round(num * 100) / 100
}

function parseSizeNumber(sizeText) {
  if (!sizeText && sizeText !== 0) return null
  const text = String(sizeText).trim()
  if (!text) return null
  // 规格格式：数字*数字（如 152*147），任一单边超档即按较大边计价
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || []
  if (!numbers.length) return null
  return Math.max(...numbers)
}

/** 会员类型图纸全局默认金额（作者无付费样本时回退）：较大边 ≤140→3；≤160→5；≤180→8；≤200→8.8；>200→9.9 */
function getMemberValueAmountBySize(sizeText) {
  const size = parseSizeNumber(sizeText)
  if (size == null) return 3
  if (size <= 140) return 3
  if (size <= 160) return 5
  if (size <= 180) return 8
  if (size <= 200) return 8.8
  return 9.9
}

function normalizePositiveAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num * 100) / 100
}

/** 从作者付费图纸样本归纳：规格较大边 → 众数金额 */
function buildAuthorPaidSizeAmountIndex(paidRefs = []) {
  const bucketMap = new Map()
  ;(paidRefs || []).forEach((item) => {
    const size = parseSizeNumber(item?.size)
    const amount = normalizePositiveAmount(item?.amount ?? item?.value_amount ?? item?.valueAmount)
    if (size == null || amount == null) return
    if (!bucketMap.has(size)) bucketMap.set(size, new Map())
    const counts = bucketMap.get(size)
    counts.set(amount, (counts.get(amount) || 0) + 1)
  })

  return [...bucketMap.entries()]
    .map(([size, counts]) => {
      const best = [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || b[0] - a[0],
      )[0]
      return { size, amount: best[0] }
    })
    .sort((a, b) => a.size - b.size)
}

/** 按作者付费图纸：同规格优先，否则最接近规格 */
function resolveAmountFromAuthorPaid(sizeText, paidRefs = []) {
  const index = buildAuthorPaidSizeAmountIndex(paidRefs)
  if (!index.length) return null

  const target = parseSizeNumber(sizeText)
  if (target == null) return null

  let best = index[0]
  let bestDist = Math.abs(best.size - target)
  for (let i = 1; i < index.length; i += 1) {
    const row = index[i]
    const dist = Math.abs(row.size - target)
    if (dist < bestDist) {
      best = row
      bestDist = dist
      continue
    }
    if (dist === bestDist && row.size <= target && best.size > target) {
      best = row
    }
  }
  return best.amount
}

function getAuthorPaidAmountRefs(author) {
  const name = String(author || '').trim()
  if (!name) return []
  return queryAll(
    `
      SELECT size, value_amount
      FROM patterns
      WHERE category = 'member'
        AND type = 'paid'
        AND author = ?
        AND value_amount IS NOT NULL
        AND value_amount > 0
    `,
    [name],
  )
}

const MEMBER_TYPE_MIN_AMOUNT = 3

function applyMemberTypeMinAmount(amount) {
  const num = Number(amount)
  if (!Number.isFinite(num)) return MEMBER_TYPE_MIN_AMOUNT
  return Math.max(MEMBER_TYPE_MIN_AMOUNT, Math.round(num * 100) / 100)
}

/** 会员类型金额：优先该作者付费图纸价格逻辑，否则全局规格档位；最低 3 */
function getMemberValueAmountByAuthorPaid(sizeText, author) {
  const fromPaid = resolveAmountFromAuthorPaid(sizeText, getAuthorPaidAmountRefs(author))
  if (fromPaid != null) return applyMemberTypeMinAmount(fromPaid)
  return applyMemberTypeMinAmount(getMemberValueAmountBySize(sizeText))
}

function resolvePatternPrice(data, existing, category) {
  if (category !== 'normal') return null
  if (Object.prototype.hasOwnProperty.call(data, 'price')) {
    return normalizePrice(data.price)
  }
  if (existing?.price !== undefined && existing?.price !== null) {
    return normalizePrice(existing.price)
  }
  return null
}

function resolvePatternValueAmount(data, existing, category) {
  if (category !== 'member') return null
  if (Object.prototype.hasOwnProperty.call(data, 'valueAmount')) {
    const normalized = normalizePrice(data.valueAmount)
    if (normalized != null) return normalized
  }
  if (existing?.value_amount !== undefined && existing?.value_amount !== null) {
    return normalizePrice(existing.value_amount)
  }
  const type = data.type ?? existing?.type
  if (type === 'member') {
    return getMemberValueAmountByAuthorPaid(
      data.size ?? existing?.size,
      data.author ?? existing?.author,
    )
  }
  if (type === 'paid') return 3
  return null
}

function nextPatternId(category) {
  const prefix = category === 'member' ? 'HY' : 'PT'
  const rows = queryAll('SELECT id FROM patterns WHERE category = ?', [category])
  let maxNum = 0
  rows.forEach((row) => {
    const num = parseInt(String(row.id).slice(prefix.length), 10)
    if (!Number.isNaN(num) && num > maxNum) maxNum = num
  })
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`
}

const DEFAULT_PATTERN_BUYER = '晴儿'

function resolvePatternBuyer(value, fallback = '') {
  const text = String(value ?? fallback ?? '').trim()
  return text || DEFAULT_PATTERN_BUYER
}

function backfillEmptyPatternBuyers() {
  const rows = queryAll(`SELECT id, buyer FROM patterns`)
  let changed = 0
  rows.forEach((row) => {
    if (String(row.buyer || '').trim()) return
    run(`UPDATE patterns SET buyer = ? WHERE id = ?`, [DEFAULT_PATTERN_BUYER, row.id])
    changed += 1
  })
  if (changed > 0) {
    persist()
    console.log(`[db] backfilled buyer=${DEFAULT_PATTERN_BUYER} for ${changed} patterns`)
  }
}

function createPattern(category, data, user) {
  const id = nextPatternId(category)
  const imageInfo = prepareImageForStorage(data.image || '')

  run(
    `
      INSERT INTO patterns (id, category, name, image, has_image, author, size, type, pattern_category, buyer, price, value_amount, completed, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      category,
      data.name || '',
      imageInfo.image,
      imageInfo.hasImage,
      data.author || '',
      data.size || '',
      data.type || 'free',
      resolvePatternCategory(data),
      resolvePatternBuyer(data.buyer),
      resolvePatternPrice(data, null, category),
      resolvePatternValueAmount(data, null, category),
      0,
      data.date || '',
    ]
  )

  if (user?.id && (normalizeCompleted(data.completed) || normalizeCompleted(data.isRepeat))) {
    setUserPatternCompleted(user.id, id, normalizeCompleted(data.completed), data.completedDate, {
      isRepeat: data.isRepeat,
      reassembleDates: data.reassembleDates,
    })
  }

  return getPatternById(id, user)
}

function updatePattern(id, data, user) {
  const existing = getById(id)
  if (!existing) return null

  if (existing.category === 'normal' && data.type === 'member') {
    data.type = 'free'
  }

  if (user?.id && (data.completed !== undefined || data.isRepeat !== undefined)) {
    const prev = getUserCompletedMap(user.id)[id] || emptyUserPatternOverlay()
    const nextCompleted =
      data.completed !== undefined ? normalizeCompleted(data.completed) : prev.completed
    const nextDate =
      data.completedDate !== undefined ? data.completedDate : prev.completedDate
    const nextRepeat =
      data.isRepeat !== undefined ? normalizeCompleted(data.isRepeat) : prev.isRepeat
    const nextDates =
      data.reassembleDates !== undefined ? data.reassembleDates : prev.reassembleDates
    setUserPatternCompleted(user.id, id, nextCompleted, nextDate, {
      isRepeat: nextRepeat,
      reassembleDates: nextDates,
    })
  }

  const shouldUpdateImage = Object.prototype.hasOwnProperty.call(data, 'image')
  const nextImage = shouldUpdateImage ? prepareImageForStorage(data.image || '') : null

  run(
    `
      UPDATE patterns
      SET name = ?,
          image = ?,
          has_image = ?,
          author = ?,
          size = ?,
          type = ?,
          pattern_category = ?,
          buyer = ?,
          price = ?,
          value_amount = ?,
          date = ?
      WHERE id = ?
    `,
    [
      data.name ?? existing.name,
      nextImage ? nextImage.image : existing.image,
      nextImage ? nextImage.hasImage : existing.has_image,
      data.author ?? existing.author,
      data.size ?? existing.size,
      data.type ?? existing.type,
      resolvePatternCategory(data, existing),
      resolvePatternBuyer(
        data.buyer !== undefined ? data.buyer : existing.buyer,
        existing.buyer,
      ),
      resolvePatternPrice(data, existing, existing.category),
      resolvePatternValueAmount(data, existing, existing.category),
      data.date ?? existing.date,
      id,
    ]
  )

  return getPatternById(id, user)
}

function deletePattern(id) {
  if (!getById(id)) return false
  run('DELETE FROM pattern_user_completed WHERE pattern_id = ?', [id])
  run('DELETE FROM patterns WHERE id = ?', [id])
  return true
}

function migratePatternUserCompleted(oldId, newId) {
  queryAll(
    'SELECT user_id, completed, completed_date FROM pattern_user_completed WHERE pattern_id = ?',
    [oldId]
  ).forEach((item) => {
    run(
      `
        INSERT INTO pattern_user_completed (user_id, pattern_id, completed, completed_date)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, pattern_id) DO UPDATE SET
          completed = excluded.completed,
          completed_date = excluded.completed_date
      `,
      [item.user_id, newId, item.completed, item.completed_date || '']
    )
  })
  run('DELETE FROM pattern_user_completed WHERE pattern_id = ?', [oldId])
}

function convertNormalPatternToMember(id, data = {}, user) {
  const existing = getById(id)
  if (!existing) return null
  if (existing.category !== 'normal') {
    throw new Error('仅普通图纸可转为会员图纸')
  }

  const allowedTypes = new Set(['free', 'paid', 'member'])
  const nextType = allowedTypes.has(data.type) ? data.type : existing.type || 'free'
  const nextBuyer = resolvePatternBuyer(
    data.buyer !== undefined && data.buyer !== null ? data.buyer : existing.buyer,
    existing.buyer,
  )

  const newId = nextPatternId('member')
  let nextValueAmount = null
  if (nextType === 'member') {
    nextValueAmount = getMemberValueAmountByAuthorPaid(existing.size, existing.author)
  } else if (nextType === 'paid') {
    nextValueAmount = 3
  }

  run(
    `
      INSERT INTO patterns (
        id, category, name, image, has_image, author, size, type,
        pattern_category, buyer, price, value_amount, completed, date
      ) VALUES (?, 'member', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      newId,
      existing.name || '',
      existing.image || '',
      existing.has_image ?? 0,
      existing.author || '',
      existing.size || '',
      nextType,
      existing.pattern_category || '',
      nextBuyer,
      null,
      nextValueAmount,
      existing.completed ?? 0,
      existing.date || '',
    ]
  )

  migratePatternUserCompleted(id, newId)
  run('DELETE FROM patterns WHERE id = ?', [id])

  return getPatternById(newId, user)
}

module.exports = {
  initDb,
  getAllPatterns,
  getPatternById,
  getPatternImageById,
  createPattern,
  updatePattern,
  deletePattern,
  convertNormalPatternToMember,
  getAllAuthorAmounts,
  upsertAuthorAmount,
  deleteAuthorAmount,
  renameAuthor,
}
