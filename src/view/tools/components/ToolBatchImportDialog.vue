<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>Excel 批量导入</h4>
            <p class="header-sub">通过模板批量新增{{ meta.label }}，单次最多 {{ maxCount }} 条</p>
          </div>
          <button type="button" class="dialog-close" :disabled="importing" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="dialog-meta">
            <span class="meta-tag">{{ meta.label }}</span>
            <span v-if="sizeHint" class="meta-hint">{{ sizeHint }}</span>
          </div>

          <div class="upload-panel">
            <div class="upload-icon">表</div>
            <p class="upload-title">上传 Excel 文件</p>
            <p class="upload-desc">请先下载对应模板，填写后上传 .xlsx / .xls 文件</p>
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
            <span class="stat-pill stat-valid">可导入 {{ validRows.length }} 行</span>
            <span v-if="invalidRows.length" class="stat-pill stat-invalid">问题 {{ invalidRows.length }} 行</span>
          </div>

          <div v-if="rows.length" class="preview-panel">
            <table>
              <thead>
                <tr>
                  <th>行号</th>
                  <th v-for="field in meta.previewFields" :key="field.key">{{ field.label }}</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.rowNumber" :class="{ 'row-error': !row.valid }">
                  <td>{{ row.rowNumber }}</td>
                  <td v-for="field in meta.previewFields" :key="field.key">
                    {{ formatImportPreviewValue(field.key, row[field.key]) }}
                  </td>
                  <td>
                    <span v-if="row.valid" class="status-ok">可导入</span>
                    <span v-else class="status-error" :title="row.errors.join('；')">
                      {{ row.errors[0] }}
                    </span>
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
            :disabled="!validRows.length || importing"
            @click="handleImport"
          >
            {{ importing ? '导入中…' : importButtonText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'
import { BOARD_ALL_SLUG, getBoardDisplayName } from '@/view/tools/constants'
import {
  downloadToolImportTemplate,
  formatImportPreviewValue,
  getToolImportMaxCount,
  getToolImportMeta,
  parseToolExcelFile,
  toToolImportPayload,
} from '@/utils/toolExcel'

const props = defineProps({
  visible: { type: Boolean, default: false },
  toolType: { type: String, required: true },
  defaultBoardSlug: { type: String, default: '' },
  importing: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'import'])

const { showError } = useMessage()

const maxCount = getToolImportMaxCount()
const fileInputRef = ref(null)
const fileName = ref('')
const rows = ref([])

const meta = computed(() => getToolImportMeta(props.toolType))
const validRows = computed(() => rows.value.filter((row) => row.valid))
const invalidRows = computed(() => rows.value.filter((row) => !row.valid))
const sizeHint = computed(() => {
  if (props.toolType !== 'board') return ''
  if (!props.defaultBoardSlug || props.defaultBoardSlug === BOARD_ALL_SLUG) {
    return '规格列必填，需与系统规格一致'
  }
  return `当前规格页：${getBoardDisplayName(props.defaultBoardSlug)}，Excel 中规格可留空`
})
const importButtonText = computed(() => {
  if (!validRows.value.length) return `导入${meta.value.label}`
  return `导入${meta.value.label}（${validRows.value.length} 条）`
})

const importContext = computed(() => ({
  defaultBoardSlug: props.defaultBoardSlug,
}))

const resetState = () => {
  fileName.value = ''
  rows.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible && !props.importing) resetState()
  },
)

watch(
  () => [props.toolType, props.defaultBoardSlug],
  async () => {
    if (!rows.value.length || !fileName.value) return
    try {
      // 切换规格页后需重新选择文件；此处仅清空避免脏数据
      resetState()
    } catch {
      resetState()
    }
  },
)

const downloadTemplate = () => {
  downloadToolImportTemplate(props.toolType)
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
    const parsed = await parseToolExcelFile(file, props.toolType, importContext.value)
    if (parsed.length > maxCount) {
      showError(`单次最多导入 ${maxCount} 条，当前 ${parsed.length} 条`)
      return
    }
    rows.value = parsed
    fileName.value = file.name
  } catch (error) {
    rows.value = []
    fileName.value = ''
    showError(error.message || 'Excel 解析失败')
  }
}

const handleImport = () => {
  if (!validRows.value.length || props.importing) return
  emit('import', {
    toolType: props.toolType,
    items: validRows.value.map((row) => toToolImportPayload(row, props.toolType)),
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
  background: rgba(61, 42, 50, 0.45);
  backdrop-filter: blur(2px);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: 900px;
  max-width: 94vw;
  max-height: 90vh;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(168, 56, 88, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, #fff 0%, var(--color-pale) 100%);
}

.header-text h4 {
  margin: 0 0 4px;
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
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
  background: var(--color-pale);
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 600;
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
}

.btn-outline {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-upload {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.file-name {
  margin: 12px 0 0;
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

.preview-panel {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
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

.row-error {
  background: #fff5f6;
}

.status-ok {
  color: #67c23a;
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
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 20px 16px;
  border-top: 1px solid var(--color-border);
}

.btn-cancel,
.btn-primary {
  min-width: 88px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-cancel:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
