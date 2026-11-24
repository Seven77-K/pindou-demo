<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>批量上传图片</h4>
            <p class="header-sub">按图片文件名与豆板名称匹配，仅为尚无图片的豆板自动配图</p>
          </div>
          <button type="button" class="dialog-close" :disabled="uploading" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <p class="meta-hint">示例：豆板「A5透明板」可匹配「A5透明板.jpg」「A5透明板*2.jpg」「A5透明板2.jpg」</p>

          <div class="upload-panel">
            <div class="upload-icon">图</div>
            <p class="upload-title">选择图片文件</p>
            <p class="upload-desc">支持多选，jpg / png / webp 等常见格式；超过 5MB 将自动压缩</p>
            <div class="upload-actions">
              <button type="button" class="btn-upload" @click="triggerFileSelect">选择图片</button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="file-input"
                @change="onFileChange"
              />
            </div>
            <p v-if="fileCount" class="file-name">已选 {{ fileCount }} 张图片</p>
          </div>

          <div v-if="rows.length" class="stats-row">
            <span class="stat-pill stat-total">共 {{ rows.length }} 张</span>
            <span class="stat-pill stat-valid">可更新 {{ matchedRows.length }} 张</span>
            <span v-if="unmatchedRows.length" class="stat-pill stat-warn">未匹配 {{ unmatchedRows.length }} 张</span>
            <span v-if="skippedRows.length" class="stat-pill stat-skip">已跳过 {{ skippedRows.length }} 张</span>
            <span v-if="errorRows.length" class="stat-pill stat-invalid">异常 {{ errorRows.length }} 张</span>
          </div>

          <div v-if="rows.length" class="preview-panel">
            <table>
              <thead>
                <tr>
                  <th>图片文件名</th>
                  <th>匹配豆板</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in rows"
                  :key="`${row.stem}-${index}`"
                  :class="{
                    'row-error': row.status === 'error',
                    'row-warn': row.status === 'unmatched',
                    'row-skip': row.status === 'skipped',
                  }"
                >
                  <td>{{ row.file.name }}</td>
                  <td>{{ row.item?.name || '-' }}</td>
                  <td>
                    <span v-if="row.status === 'matched'" class="status-ok">{{ row.message }}</span>
                    <span v-else-if="row.status === 'skipped'" class="status-skip">{{ row.message }}</span>
                    <span v-else-if="row.status === 'unmatched'" class="status-warn">{{ row.message }}</span>
                    <span v-else class="status-error">{{ row.message }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" :disabled="uploading" @click="handleClose">取消</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!matchedRows.length || uploading"
            @click="handleConfirm"
          >
            {{ uploading ? '上传中…' : confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'
import { matchImagesToToolItems } from '@/utils/toolImageMatch'

const props = defineProps({
  visible: { type: Boolean, default: false },
  boards: { type: Array, default: () => [] },
  uploading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'confirm'])

const { showError } = useMessage()

const fileInputRef = ref(null)
const rows = ref([])

const fileCount = computed(() => rows.value.length)
const matchedRows = computed(() => rows.value.filter((row) => row.status === 'matched'))
const unmatchedRows = computed(() => rows.value.filter((row) => row.status === 'unmatched'))
const skippedRows = computed(() => rows.value.filter((row) => row.status === 'skipped'))
const errorRows = computed(() => rows.value.filter((row) => row.status === 'error'))
const confirmButtonText = computed(() => {
  if (!matchedRows.value.length) return '更新豆板图片'
  return `更新 ${matchedRows.value.length} 张图片`
})

const resetState = () => {
  rows.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const rematch = () => {
  if (!rows.value.length) return
  const files = rows.value.map((row) => row.file)
  rows.value = matchImagesToToolItems(files, props.boards)
}

watch(
  () => props.boards,
  () => rematch(),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible && !props.uploading) resetState()
  },
)

const handleClose = () => {
  if (props.uploading) return
  emit('update:visible', false)
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const onFileChange = (event) => {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  const invalid = files.find((file) => !file.type.startsWith('image/'))
  if (invalid) {
    showError('请选择图片文件')
    return
  }

  rows.value = matchImagesToToolItems(files, props.boards)
}

const handleConfirm = () => {
  if (!matchedRows.value.length) return
  emit('confirm', { matches: matchedRows.value })
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
  width: 720px;
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.header-text h4 {
  margin: 0 0 4px;
  color: var(--color-text-primary);
  font-size: 16px;
}

.header-sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover:not(:disabled) {
  background: var(--color-pale);
  color: var(--color-text-primary);
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

.meta-hint {
  margin: 0 0 14px;
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
  gap: 10px;
  justify-content: center;
}

.btn-upload {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
}

.btn-upload:hover {
  opacity: 0.92;
}

.file-input {
  display: none;
}

.file-name {
  margin: 12px 0 0;
  color: var(--color-text-regular);
  font-size: 13px;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.stat-total {
  background: #f5f5f5;
  color: var(--color-text-regular);
}

.stat-valid {
  background: #e8f8f4;
  color: #0d9488;
}

.stat-warn {
  background: #fff7ed;
  color: #ea580c;
}

.stat-invalid {
  background: #fff0f2;
  color: #e85d6a;
}

.stat-skip {
  background: #f3f4f6;
  color: #6b7280;
}

.preview-panel {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.preview-panel table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-panel th,
.preview-panel td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.preview-panel th {
  background: var(--color-pale);
  color: var(--color-text-regular);
  font-weight: 600;
}

.preview-panel tr:last-child td {
  border-bottom: none;
}

.row-error {
  background: #fff8f8;
}

.row-warn {
  background: #fffbf5;
}

.row-skip {
  background: #f9fafb;
}

.status-ok {
  color: #0d9488;
}

.status-warn {
  color: #ea580c;
}

.status-skip {
  color: #6b7280;
}

.status-error {
  color: #e85d6a;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
}

.btn-cancel {
  padding: 8px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
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
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
