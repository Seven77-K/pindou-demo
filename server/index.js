const express = require('express')
const cors = require('cors')
const compression = require('compression')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const db = require('./db')
const auth = require('./auth')

const app = express()
const PORT = process.env.PORT || 5091
const uploadsDir = path.join(__dirname, 'uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true)
      return
    }
    cb(new Error('只能上传图片文件'))
  },
})

app.use(cors())
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  const result = auth.login(username, password)
  if (!result.ok) {
    res.status(401).json({ code: 401, message: result.message })
    return
  }
  res.json({ code: 0, data: result.data })
})

app.get('/api/auth/me', auth.authMiddleware, (req, res) => {
  res.json({ code: 0, data: req.authUser })
})

app.post('/api/auth/logout', auth.authMiddleware, (req, res) => {
  auth.logout(req.authToken)
  res.json({ code: 0, data: true })
})

app.post('/api/auth/change-password', auth.authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    res.status(400).json({ code: 400, message: '请填写当前密码和新密码' })
    return
  }
  const result = auth.changePassword(req.authUser.id, currentPassword, newPassword)
  if (!result.ok) {
    res.status(400).json({ code: 400, message: result.message })
    return
  }
  res.json({ code: 0, data: true })
})

app.get('/api/users', auth.authMiddleware, auth.userManageMiddleware, (_req, res) => {
  res.json({ code: 0, data: auth.listUsers() })
})

app.get('/api/users/:id', auth.authMiddleware, auth.userManageMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const user = auth.getAdminUserById(id)
  if (!user) {
    res.status(404).json({ code: 404, message: '用户不存在' })
    return
  }
  res.json({ code: 0, data: user })
})

app.post('/api/users', auth.authMiddleware, auth.userManageMiddleware, (req, res) => {
  const result = auth.createUser(req.body || {})
  if (!result.ok) {
    res.status(400).json({ code: 400, message: result.message })
    return
  }
  res.status(201).json({ code: 0, data: result.data })
})

app.put('/api/users/:id', auth.authMiddleware, auth.userManageMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const result = auth.updateUser(id, req.body || {}, req.authUser)
  if (!result.ok) {
    res.status(400).json({ code: 400, message: result.message })
    return
  }
  res.json({ code: 0, data: result.data })
})

app.delete('/api/users/:id', auth.authMiddleware, auth.userManageMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const result = auth.deleteUser(id, req.authUser)
  if (!result.ok) {
    res.status(400).json({ code: 400, message: result.message })
    return
  }
  res.json({ code: 0, data: true })
})

app.post('/api/upload', auth.authMiddleware, (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      res.status(400).json({ code: 400, message: error.message || 'upload failed' })
      return
    }
    if (!req.file) {
      res.status(400).json({ code: 400, message: '请选择图片文件' })
      return
    }
    res.json({ code: 0, data: { url: `/uploads/${req.file.filename}` } })
  })
})

app.get('/api/patterns', auth.authMiddleware, (req, res) => {
  res.json({ code: 0, data: db.getAllPatterns({ includeImages: false, user: req.authUser }) })
})

app.get('/api/patterns/:id/image', auth.authMiddleware, (req, res) => {
  const image = db.getPatternImageById(req.params.id)
  if (!image) {
    res.status(404).json({ code: 404, message: 'image not found' })
    return
  }
  res.json({ code: 0, data: { image } })
})

app.get('/api/patterns/:id', auth.authMiddleware, (req, res) => {
  const pattern = db.getPatternById(req.params.id, req.authUser)
  if (!pattern) {
    res.status(404).json({ code: 404, message: 'pattern not found' })
    return
  }
  res.json({ code: 0, data: pattern })
})

app.post('/api/patterns', auth.authMiddleware, (req, res) => {
  const { category, ...data } = req.body

  if (category !== 'member' && category !== 'normal') {
    res.status(400).json({ code: 400, message: 'category must be member or normal' })
    return
  }

  if (!data.name?.trim()) {
    res.status(400).json({ code: 400, message: '请填写图纸名称' })
    return
  }

  if (!data.author?.trim()) {
    res.status(400).json({ code: 400, message: '请填写图纸作者' })
    return
  }

  if (!data.size?.trim()) {
    res.status(400).json({ code: 400, message: '请填写规格' })
    return
  }

  if (category === 'normal' && data.type === 'member') {
    data.type = 'free'
  }

  try {
    const created = db.createPattern(category, data, req.authUser)
    res.status(201).json({ code: 0, data: created })
  } catch (error) {
    console.error('[api] create pattern failed:', error)
    res.status(500).json({ code: 500, message: error.message || '保存失败' })
  }
})

app.post('/api/patterns/batch', auth.authMiddleware, (req, res) => {
  const { category, items } = req.body

  if (category !== 'member' && category !== 'normal') {
    res.status(400).json({ code: 400, message: 'category must be member or normal' })
    return
  }

  if (!Array.isArray(items) || !items.length) {
    res.status(400).json({ code: 400, message: '导入数据不能为空' })
    return
  }

  if (items.length > 500) {
    res.status(400).json({ code: 400, message: '单次最多导入 500 条' })
    return
  }

  const created = []

  try {
    for (let index = 0; index < items.length; index += 1) {
      const data = items[index]

      if (!data.name?.trim()) {
        res.status(400).json({ code: 400, message: `第 ${index + 1} 条：请填写图纸名称` })
        return
      }

      if (!data.author?.trim()) {
        res.status(400).json({ code: 400, message: `第 ${index + 1} 条：请填写图纸作者` })
        return
      }

      if (!data.size?.trim()) {
        res.status(400).json({ code: 400, message: `第 ${index + 1} 条：请填写规格` })
        return
      }

      if (category === 'normal' && data.type === 'member') {
        data.type = 'free'
      }

      created.push(db.createPattern(category, data, req.authUser))
    }

    res.status(201).json({ code: 0, data: created })
  } catch (error) {
    console.error('[api] batch create pattern failed:', error)
    res.status(500).json({ code: 500, message: error.message || '批量导入失败' })
  }
})

app.put('/api/patterns/:id', auth.authMiddleware, (req, res) => {
  try {
    const updated = db.updatePattern(req.params.id, req.body, req.authUser)
    if (!updated) {
      res.status(404).json({ code: 404, message: 'pattern not found' })
      return
    }
    res.json({ code: 0, data: updated })
  } catch (error) {
    console.error('[api] update pattern failed:', error)
    res.status(500).json({ code: 500, message: error.message || '保存失败' })
  }
})

app.post('/api/patterns/:id/convert-to-member', auth.authMiddleware, (req, res) => {
  try {
    const converted = db.convertNormalPatternToMember(req.params.id, req.body || {}, req.authUser)
    if (!converted) {
      res.status(404).json({ code: 404, message: 'pattern not found' })
      return
    }
    res.json({ code: 0, data: converted })
  } catch (error) {
    console.error('[api] convert pattern failed:', error)
    res.status(400).json({ code: 400, message: error.message || '转换失败' })
  }
})

app.delete('/api/patterns/:id', auth.authMiddleware, (req, res) => {
  const deleted = db.deletePattern(req.params.id)
  if (!deleted) {
    res.status(404).json({ code: 404, message: 'pattern not found' })
    return
  }
  res.json({ code: 0, data: true })
})

app.get('/api/author-amounts', auth.authMiddleware, (_req, res) => {
  res.json({ code: 0, data: db.getAllAuthorAmounts() })
})

app.put('/api/author-amounts', auth.authMiddleware, (req, res) => {
  try {
    const { author, buyer, amount, date } = req.body || {}
    const saved = db.upsertAuthorAmount(author, buyer, amount, date)
    res.json({ code: 0, data: saved })
  } catch (error) {
    console.error('[api] upsert author amount failed:', error)
    res.status(400).json({ code: 400, message: error.message || '保存失败' })
  }
})

app.delete('/api/author-amounts', auth.authMiddleware, (req, res) => {
  const { author, buyer } = req.body || {}
  if (!author?.trim()) {
    res.status(400).json({ code: 400, message: '请填写作者名称' })
    return
  }
  try {
    db.deleteAuthorAmount(author, buyer)
    res.json({ code: 0, data: true })
  } catch (error) {
    console.error('[api] delete author amount failed:', error)
    res.status(400).json({ code: 400, message: error.message || '删除失败' })
  }
})

app.post('/api/authors/rename', auth.authMiddleware, (req, res) => {
  try {
    const { from, to } = req.body || {}
    const result = db.renameAuthor(from, to)
    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('[api] rename author failed:', error)
    res.status(400).json({ code: 400, message: error.message || '重命名失败' })
  }
})

db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] API running at http://localhost:${PORT}`)
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[server] 端口 ${PORT} 已被占用，请先关闭旧的后端进程，或访问 http://127.0.0.1:${PORT}/api/health 确认是否已在运行`)
      } else {
        console.error('[server] failed to listen:', error)
      }
      process.exit(1)
    })
  })
  .catch((error) => {
    console.error('[server] failed to start:', error)
    process.exit(1)
  })
