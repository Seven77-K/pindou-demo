<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>Excel 批量导入</h4>
            <p class="header-sub">通过模板批量新增图纸，单次最多 {{ maxCount }} 条</p>
          </div>
          <button type="button" class="dialog-close" :disabled="importing" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="dialog-meta">
            <span class="meta-tag" :class="category === 'member' ? 'meta-member' : 'meta-normal'">
              {{ categoryLabel }}
            </span>
            <span class="meta-hint">图纸类型：{{ typeHint }}；预览中可勾选删除已有图纸</span>
          </div>

          <div class="upload-panel">
            <div class="upload-icon">表</div>
            <p class="upload-title">上传 Excel 文件</p>
            <p class="upload-desc">请先下载模板，填写后上传 .xlsx / .xls 文件</p>
            <div class="upload-actions">
              <button type="button" class="btn-outline" @click="downloadTemplate">下载模板</button>
              <button type="button" class="btn-upload" @click="triggerFileSelect">选择文件</button>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx,.xls"
                class="file-input"
                @change="onFileChange"
              />
            </div>
            <p v-if="fileName" class="file-name">{{ fileName }}</p>
          </div>

          <div v-if="rows.length" class="stats-row">
            <span class="stat-pill stat-total">共 {{ rows.length }} 行</span>
            <span class="stat-pill stat-valid">可导入 {{ importRows.length }} 行</span>
            <span v-if="deleteRows.length" class="stat-pill stat-delete">待删除 {{ deleteRows.length }} 行</span>
            <span v-if="invalidRows.length" class="stat-pill stat-invalid">问题 {{ invalidRows.length }} 行</span>
          </div>

          <div v-if="rows.length" class="preview-panel">
            <table>
              <thead>
                <tr>
                  <th class="col-delete">删除</th>
                  <th>行号</th>
                  <th>图纸名称</th>
                  <th>图纸作者</th>
                  <th>规格</th>
                  <th>图纸类别</th>
                  <th>图纸类型</th>
                  <th>购买人</th>
                  <th v-if="category === 'normal'">价格</th>
                  <th v-if="category === 'member'">金额</th>
                  <th>是否完成</th>
                  <th>图纸日期</th>
                  <th>状态</th>
                  <th class="col-force">是否上传</th>
                  <th class="col-exist-image">图纸图片</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="row.rowNumber"
                  :class="{
                    'row-error': !row.valid,
                    'row-delete': row.markDelete && row.valid,
                    'row-force': row.forceUpload && row.valid && !row.markDelete,
                  }"
                >
                  <td class="col-delete">
                    <input
                      type="checkbox"
                      class="row-delete-checkbox"
                      :checked="row.markDelete"
                      @change="toggleRowDelete(row)"
                    />
                  </td>
                  <td>{{ row.rowNumber }}</td>
                  <td>{{ row.name || '-' }}</td>
                  <td
                    :title="
                      row.authorRaw && row.authorRaw !== row.author
                        ? `Excel原名：${row.authorRaw}`
                        : ''
                    "
                  >
                    {{ row.author || '-' }}
                  </td>
                  <td>{{ row.size || '-' }}</td>
                  <td>{{ row.patternCategory || '-' }}</td>
                  <td>{{ typeLabel(row.type) }}</td>
                  <td>{{ row.buyer || '-' }}</td>
                  <td v-if="category === 'normal'">{{ formatImportPrice(row.price) }}</td>
                  <td v-if="category === 'member'">{{ formatImportValueAmount(row, memberPatterns) }}</td>
                  <td>{{ completedLabel(row.completed) }}</td>
                  <td>{{ row.date || '-' }}</td>
                  <td>
                    <span v-if="row.valid && row.markDelete" class="status-delete">待删除</span>
                    <span v-else-if="row.valid && row.forceUpload" class="status-ok">确认上传</span>
                    <span v-else-if="row.valid" class="status-ok">可导入</span>
                    <span v-else class="status-error" :title="row.errors.join('；')">
                      {{ row.errors[0] }}
                    </span>
                  </td>
                  <td class="col-force">
                    <button
                      v-if="canForceUpload(row)"
                      type="button"
                      class="btn-force-check"
                      :class="{ 'is-active': row.forceUpload }"
                      :title="row.forceUpload ? '取消确认' : '确认仍要上传'"
                      :disabled="importing"
                      @click="toggleForceUpload(row)"
                    >
                      ✓
                    </button>
                  </td>
                  <td class="col-exist-image">
                    <template v-if="row.duplicateExisting && row.existingPattern">
                      <span class="exist-thumb-wrap">
                        <img
                          v-if="existingImage(row)"
                          class="exist-thumb"
                          :src="existingImage(row)"
                          :alt="row.existingPattern.name"
                          @click="openExistingPreview(row)"
                        />
                        <span
                          v-else-if="row.existingPattern.hasImage"
                          class="exist-thumb-placeholder"
                        >
                          加载中
                        </span>
                        <span v-else class="exist-thumb-placeholder">无图</span>
                      </span>
                    </template>
                    <span v-else class="exist-thumb-empty">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" :disabled="importing" @click="handleClose">取消</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!actionCount || importing"
            @click="handleImport"
          >
            {{ importing ? '处理中…' : importButtonText }}
          </button>
        </div>
      </div>
    </div>

    <PatternPreviewDialog
      v-model:visible="previewVisible"
      :name="preview?.name"
      :image="preview?.image"
    />
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  getPatternImage,
  loadPatternImage,
  loadPatternImages,
  patternTypeLabels,
  usePatternData,
} from '@/composables/usePatternData'
import { useAuthorAmounts } from '@/composables/useAuthorAmounts'
import { useMessage } from '@/composables/useMessage'
import PatternPreviewDialog from './PatternPreviewDialog.vue'
import {
  applyImportDuplicateChecks,
  buildAuthorFrequencyMap,
  collectExistingAuthorNames,
  downloadPatternImportTemplate,
  formatImportValueAmount,
  findPatternByIdentity,
  parsePatternExcelFile,
  resolveAuthorName,
  revalidateImportRows,
  toPatternPayload,
} from '@/utils/patternExcel'

const props = defineProps({
  visible: { type: Boolean, default: false },
  category: { type: String, default: 'member' },
  patterns: { type: Array, default: () => [] },
  importing: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'import'])

const { showError } = useMessage()
const { patternImageCache, memberPatterns, normalPatterns } = usePatternData()
const { listAuthorNames } = useAuthorAmounts()

const maxCount = 500
const fileInputRef = ref(null)
const fileName = ref('')
const rows = ref([])
const preview = ref(null)

const existingAuthorNames = computed(() => {
  void memberPatterns.value
  void normalPatterns.value
  return collectExistingAuthorNames(
    [...memberPatterns.value, ...normalPatterns.value, ...props.patterns],
    listAuthorNames(),
  )
})

const authorFrequency = computed(() =>
  buildAuthorFrequencyMap([
    ...memberPatterns.value,
    ...normalPatterns.value,
    ...props.patterns,
  ]),
)

const categoryLabel = computed(() => (props.category === 'member' ? '会员图纸' : '普通图纸'))
const typeHint = computed(() =>
  props.category === 'member' ? '免费 / 付费 / 会员' : '免费 / 付费'
)
const validRows = computed(() => rows.value.filter((row) => row.valid))
const importRows = computed(() => validRows.value.filter((row) => !row.markDelete))
const deleteRows = computed(() => validRows.value.filter((row) => row.markDelete))
const invalidRows = computed(() => rows.value.filter((row) => !row.valid))
const actionCount = computed(() => importRows.value.length + deleteRows.value.length)
const importButtonText = computed(() => {
  if (!actionCount.value) return `导入到${categoryLabel.value}`
  const parts = []
  if (importRows.value.length) parts.push(`导入 ${importRows.value.length} 条`)
  if (deleteRows.value.length) parts.push(`删除 ${deleteRows.value.length} 条`)
  return parts.join('，')
})

const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (visible) => {
    if (!visible) preview.value = null
  },
})

const existingImage = (row) => {
  void patternImageCache.value
  const existing = row?.existingPattern
  if (!existing) return ''
  return getPatternImage(existing)
}

const loadExistingImages = async () => {
  const items = rows.value
    .map((row) => row.existingPattern)
    .filter((item) => item?.id && item.hasImage && !getPatternImage(item))
  if (!items.length) return
  const unique = [...new Map(items.map((item) => [item.id, item])).values()]
  await loadPatternImages(unique, props.category)
}

const openExistingPreview = async (row) => {
  const existing = row?.existingPattern
  if (!existing) return
  let image = existingImage(row)
  if (!image && existing.hasImage) {
    image = await loadPatternImage(existing.id, props.category)
  }
  if (!image) return
  preview.value = {
    name: existing.name || row.name || '已有图纸',
    image,
  }
}

const normalizeImportRow = (row) => {
  const rawAuthor = row.authorRaw || row.author
  const resolvedAuthor = resolveAuthorName(
    rawAuthor,
    existingAuthorNames.value,
    authorFrequency.value,
  )
  return {
    name: row.name,
    author: resolvedAuthor,
    authorRaw: rawAuthor,
    size: row.size,
    patternCategory: row.patternCategory,
    type: row.type,
    typeError: row.typeError || '',
    buyer: row.buyer,
    price: row.price ?? null,
    priceError: row.priceError || '',
    valueAmount: row.valueAmount ?? null,
    valueAmountError: row.valueAmountError || '',
    hasValueAmountColumn: row.hasValueAmountColumn === true,
    completed: row.completed,
    date: row.date,
    markDelete: row.markDelete === true,
    forceUpload: row.forceUpload === true,
    image: row.image || '',
    rowNumber: row.rowNumber,
  }
}

const finalizeDeleteRow = (base) => {
  const errors = [...(base.errors || [])]
  const match = findPatternByIdentity(props.patterns, base.name, base.author)
  if (base.name && base.author && !match) {
    errors.push('未找到同名同作者图纸，无法删除')
  }

  return {
    ...base,
    existingId: match?.id ?? null,
    errors,
    valid: errors.length === 0,
    markDelete: true,
  }
}

const finalizeRows = (parsed) => {
  const draft = revalidateImportRows(
    parsed.map(normalizeImportRow),
    props.category,
  ).map((base) => {
    if (base.markDelete) return finalizeDeleteRow(base)
    return { ...base, existingId: null }
  })

  rows.value = applyImportDuplicateChecks(draft, props.patterns)
  nextTick(() => {
    loadExistingImages()
  })
}

const applyRows = (parsed) => {
  finalizeRows(parsed)
}

const refreshRows = () => {
  if (!rows.value.length) return
  finalizeRows(rows.value)
}

const resetState = () => {
  fileName.value = ''
  rows.value = []
  preview.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

watch(
  () => props.category,
  () => {
    refreshRows()
  }
)

watch(
  () => props.patterns,
  () => {
    refreshRows()
  },
  { deep: true }
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible && !props.importing) resetState()
  }
)

const downloadTemplate = async () => {
  const label = categoryLabel.value
  try {
    await ElMessageBox.confirm(
      `确认下载「${label}」Excel 导入模板吗？`,
      '下载模板',
      {
        confirmButtonText: '下载',
        cancelButtonText: '取消',
        type: 'info',
      },
    )
  } catch {
    return
  }
  downloadPatternImportTemplate(props.category)
}

const handleClose = () => {
  if (props.importing) return
  emit('update:visible', false)
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const onFileChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (!/\.xlsx?$/.test(file.name.toLowerCase())) {
    showError('请选择 .xlsx 或 .xls 文件')
    return
  }

  try {
    const parsed = await parsePatternExcelFile(file, props.category)
    if (parsed.length > maxCount) {
      showError(`单次最多导入 ${maxCount} 条，当前 ${parsed.length} 条`)
      return
    }
    applyRows(parsed)
    fileName.value = file.name
  } catch (error) {
    rows.value = []
    fileName.value = ''
    showError(error.message || 'Excel 解析失败')
  }
}

const typeLabel = (type) => patternTypeLabels[type] || type || '-'

const completedLabel = (value) => {
  if (value === true) return '已完成'
  if (value === false) return '未完成'
  return '-'
}

const formatImportPrice = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

const toggleRowDelete = (row) => {
  const index = rows.value.findIndex((item) => item.rowNumber === row.rowNumber)
  if (index === -1) return
  finalizeRows(
    rows.value.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, markDelete: !item.markDelete, forceUpload: false }
        : item,
    ),
  )
}

const canForceUpload = (row) =>
  Boolean(row.duplicateExisting && !row.markDelete)

const toggleForceUpload = (row) => {
  if (props.importing || !canForceUpload(row)) return
  const index = rows.value.findIndex((item) => item.rowNumber === row.rowNumber)
  if (index === -1) return
  finalizeRows(
    rows.value.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, forceUpload: !item.forceUpload, markDelete: false }
        : item,
    ),
  )
}

const handleImport = () => {
  if (!actionCount.value || props.importing) return
  emit('import', {
    category: props.category,
    items: importRows.value.map((row) =>
      toPatternPayload(row, props.category, { memberPatterns: memberPatterns.value }),
    ),
    deleteIds: deleteRows.value.map((row) => row.existingId).filter(Boolean),
  })
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.65);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: 980px;
  max-width: 96vw;
  max-height: 90vh;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.header-text h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.header-sub {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dialog-close:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.dialog-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow: auto;
}

.dialog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.meta-tag {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.meta-member {
  background: #f3ebff;
  color: #9333ea;
}

.meta-normal {
  background: #fff0f2;
  color: #e85d6a;
}

.meta-hint {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.upload-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  padding: 24px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
  text-align: center;
}

.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-accent);
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(200, 140, 160, 0.15);
}

.upload-title {
  margin: 0 0 6px;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
}

.upload-desc {
  margin: 0 0 16px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.file-input {
  display: none;
}

.btn-outline,
.btn-upload {
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-outline:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-upload {
  border: none;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
}

.btn-upload:hover {
  opacity: 0.92;
}

.file-name {
  margin: 12px 0 0;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-accent);
  font-size: 13px;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.5;
}

.stat-total {
  background: var(--color-pale);
  color: var(--color-text-regular);
}

.stat-valid {
  background: #f0f9eb;
  color: #67c23a;
}

.stat-invalid {
  background: #fff5f6;
  color: #e85d6a;
}

.stat-delete {
  background: #fff7ed;
  color: #ea580c;
}

.preview-panel {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-size: 12px;
  white-space: nowrap;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: var(--color-text-secondary);
  font-weight: 500;
  background: var(--color-pale);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: #fff9fb;
}

.row-error {
  background: #fff5f6;
}

.row-delete {
  background: #fffbf5;
}

.row-force {
  background: #f3faf0;
}

.col-delete {
  width: 52px;
}

.col-force {
  width: 72px;
}

.col-exist-image {
  width: 72px;
}

.exist-thumb-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  vertical-align: middle;
}

.exist-thumb {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  cursor: zoom-in;
}

.exist-thumb-placeholder,
.exist-thumb-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.2;
}

.exist-thumb-placeholder {
  border: 1px dashed var(--color-border);
  background: var(--color-pale);
}

.exist-thumb-empty {
  width: auto;
  height: auto;
  color: #c4b4bc;
}

.row-delete-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.btn-force-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #d8e8cf;
  border-radius: 6px;
  background: #fff;
  color: #9aab90;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-force-check:hover:not(:disabled) {
  border-color: #67c23a;
  color: #67c23a;
  background: #f0f9eb;
}

.btn-force-check.is-active {
  border-color: #67c23a;
  background: #67c23a;
  color: #fff;
}

.btn-force-check:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-ok {
  color: #67c23a;
  font-weight: 500;
}

.status-delete {
  color: #ea580c;
  font-weight: 500;
}

.status-error {
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  color: #e85d6a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  justify-content: flex-end;
  padding: 14px 20px 16px;
  border-top: 1px solid var(--color-border);
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
