<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>批量识图入库</h4>
            <p class="header-sub">
              适合豆仓类截图；购买人默认当前页「{{ buyer || '—' }}」。
              类型含会员 / 付费 / 免费：会员金额按系统定价，付费读取图上金额，免费无金额
            </p>
          </div>
          <button type="button" class="dialog-close" :disabled="busy" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="dialog-meta">
            <span class="meta-hint">识别基准日：{{ baseDate }}（用于换算「N天前」）</span>
            <input
              v-model="baseDate"
              type="date"
              class="base-date"
              :disabled="recognizing || importing"
            />
          </div>

          <div class="upload-panel">
            <div class="upload-icon">识</div>
            <p class="upload-title">批量选择截图</p>
            <p class="upload-desc">支持多选；一张里有多张卡会自动拆开识别。点缩略图可放大对比</p>
            <div class="upload-actions">
              <button
                type="button"
                class="btn-upload"
                :disabled="recognizing || importing"
                @click="triggerFileSelect"
              >
                选择截图
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="file-input"
                @change="onFileChange"
              />
            </div>
            <p v-if="progressText" class="file-name">{{ progressText }}</p>
          </div>

          <div v-if="rows.length" class="stats-row">
            <span class="stat-pill stat-total">共 {{ rows.length }} 张</span>
            <span class="stat-pill stat-valid">可入库 {{ validRows.length }} 张</span>
            <span v-if="invalidRows.length" class="stat-pill stat-invalid">
              待核对 {{ invalidRows.length }} 张
            </span>
          </div>

          <div v-if="rows.length" class="preview-panel">
            <table>
              <thead>
                <tr>
                  <th class="col-check">选</th>
                  <th class="col-thumb">截图</th>
                  <th>图纸名称</th>
                  <th>作者</th>
                  <th>规格</th>
                  <th>类型</th>
                  <th>购买人</th>
                  <th v-if="category === 'member'">金额</th>
                  <th>图纸日期</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="row.id"
                  :class="{ 'row-error': !row.valid, 'row-skip': !row.selected }"
                >
                  <td class="col-check">
                    <input v-model="row.selected" type="checkbox" :disabled="importing" />
                  </td>
                  <td class="col-thumb">
                    <button
                      v-if="row.previewUrl"
                      type="button"
                      class="thumb-btn"
                      title="点击查看大图"
                      @click="openPreview(row)"
                    >
                      <img class="thumb" :src="row.previewUrl" alt="" />
                    </button>
                  </td>
                  <td>
                    <input v-model="row.name" class="cell-input" :disabled="importing" @input="revalidate(row)" />
                  </td>
                  <td>
                    <input v-model="row.author" class="cell-input" :disabled="importing" @input="onAuthorOrSizeChange(row)" />
                  </td>
                  <td>
                    <input v-model="row.size" class="cell-input cell-input-sm" :disabled="importing" @input="onAuthorOrSizeChange(row)" />
                  </td>
                  <td>
                    <select v-model="row.type" class="cell-select" :disabled="importing" @change="onAuthorOrSizeChange(row)">
                      <option value="member">会员</option>
                      <option value="paid">付费</option>
                      <option value="free">免费</option>
                    </select>
                  </td>
                  <td>{{ row.buyer || '—' }}</td>
                  <td v-if="category === 'member'">
                    <input
                      v-model="row.valueAmountText"
                      class="cell-input cell-input-sm"
                      :disabled="importing || row.type === 'free'"
                      :placeholder="row.type === 'paid' ? '图上金额' : row.type === 'member' ? '系统定价' : '—'"
                    />
                  </td>
                  <td>
                    <input v-model="row.date" type="date" class="cell-input cell-input-date" :disabled="importing" @change="revalidate(row)" />
                  </td>
                  <td>
                    <span v-if="row.valid" class="status-ok">可入库</span>
                    <span v-else class="status-error" :title="row.errors.join('；')">
                      {{ row.errors[0] || '待核对' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" :disabled="busy" @click="handleClose">取消</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!selectedValidRows.length || busy"
            @click="handleConfirm"
          >
            {{ importing ? '入库中…' : `确认入库 ${selectedValidRows.length} 条` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <PatternPreviewDialog
    v-model:visible="previewVisible"
    :name="previewName"
    :image="previewImage"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useMessage } from '@/composables/useMessage'
import PatternPreviewDialog from '@/view/pattern/components/PatternPreviewDialog.vue'
import {
  buildAuthorFrequencyMap,
  resolveAuthorName,
} from '@/utils/patternExcel'
import {
  recognizePatternScreenshot,
  suggestRecognizeValueAmount,
  terminateRecognizeWorker,
} from '@/utils/patternScreenshotRecognize'

const props = defineProps({
  visible: { type: Boolean, default: false },
  category: { type: String, default: 'member' },
  buyer: { type: String, default: '' },
  memberPatterns: { type: Array, default: () => [] },
  existingAuthors: { type: Array, default: () => [] },
  importing: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'import'])

const { showError } = useMessage()
const fileInputRef = ref(null)
const rows = ref([])
const recognizing = ref(false)
const progressText = ref('')
const baseDate = ref(dayjs().format('YYYY-MM-DD'))
const previewVisible = ref(false)
const previewName = ref('')
const previewImage = ref('')
let rowSeed = 0

const busy = computed(() => recognizing.value || props.importing)
const validRows = computed(() => rows.value.filter((row) => row.valid))
const invalidRows = computed(() => rows.value.filter((row) => !row.valid))
const selectedValidRows = computed(() =>
  rows.value.filter((row) => row.selected && row.valid),
)

const openPreview = (row) => {
  if (!row?.previewUrl) return
  previewName.value = row.name || row.file?.name || '识图预览'
  previewImage.value = row.previewUrl
  previewVisible.value = true
}

const revokePreviews = () => {
  rows.value.forEach((row) => {
    if (row.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(row.previewUrl)
  })
}

const resetState = async () => {
  revokePreviews()
  rows.value = []
  progressText.value = ''
  recognizing.value = false
  previewVisible.value = false
  previewName.value = ''
  previewImage.value = ''
  baseDate.value = dayjs().format('YYYY-MM-DD')
  await terminateRecognizeWorker()
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const revalidate = (row) => {
  const errors = []
  const name = String(row.name || '').trim()
  const author = String(row.author || '').trim()
  if (!name) errors.push('缺少图纸名称')
  else if (name.length < 2 || !/[\u4e00-\u9fa5A-Za-z]/.test(name) || /^[\d\s<>=|_.;:：-]+$/.test(name)) {
    errors.push('图纸名称异常，请手动修改')
  }
  if (!author) errors.push('缺少作者')
  else if (author.length < 2 || !/[\u4e00-\u9fa5A-Za-z]/.test(author) || /[=<>|_]/.test(author)) {
    errors.push('作者异常，请手动修改')
  }
  if (!String(row.size || '').trim()) errors.push('缺少规格')
  if (!String(row.date || '').trim()) errors.push('缺少日期')
  row.errors = errors
  row.valid = errors.length === 0
}

const refreshAmount = (row) => {
  if (props.category !== 'member' || row.type === 'free') {
    row.valueAmountText = ''
    return
  }
  const amount = suggestRecognizeValueAmount({
    type: row.type,
    size: row.size,
    author: row.author,
    memberPatterns: props.memberPatterns,
    category: props.category,
    ocrAmount: row.ocrAmount,
  })
  row.valueAmountText = amount == null ? '' : String(amount)
}

const onAuthorOrSizeChange = (row) => {
  refreshAmount(row)
  revalidate(row)
}

const onFileChange = async (event) => {
  const files = [...(event.target.files || [])].filter((file) =>
    String(file.type || '').startsWith('image/'),
  )
  event.target.value = ''
  if (!files.length) {
    showError('请选择图片文件')
    return
  }
  if (files.length > 30) {
    showError('单次最多识别 30 张截图')
    return
  }

  recognizing.value = true
  revokePreviews()
  rows.value = []
  progressText.value = `准备识别 0/${files.length}`

  try {
    const nextRows = []
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      progressText.value = `正在识别 ${index + 1}/${files.length}：${file.name}`
      try {
        const results = await recognizePatternScreenshot(file, {
          existingAuthors: props.existingAuthors,
          baseDate: baseDate.value,
          memberPatterns: props.memberPatterns,
          category: props.category,
          buyer: props.buyer,
        })
        const list = Array.isArray(results) ? results : [results]
        const authorFrequency = buildAuthorFrequencyMap(props.memberPatterns)
        list.forEach((result, cardIndex) => {
          const resolvedAuthor = resolveAuthorName(
            result.author || '',
            props.existingAuthors,
            authorFrequency,
          )
          const row = {
            id: `recognize-${Date.now()}-${rowSeed += 1}`,
            selected: true,
            file: result.file,
            previewUrl: result.previewUrl,
            name: result.name || '',
            author: resolvedAuthor,
            size: result.size || '',
            type: result.type || 'member',
            buyer: props.buyer || result.buyer || '',
            date: result.date || baseDate.value,
            ocrAmount: result.ocrAmount ?? null,
            valueAmountText:
              result.valueAmount == null ? '' : String(result.valueAmount),
            rawText: result.rawText || '',
            errors: [...(result.errors || [])],
            valid: Boolean(result.valid),
            sourceName: list.length > 1 ? `${file.name} #${cardIndex + 1}` : file.name,
          }
          revalidate(row)
          nextRows.push(row)
        })
      } catch (error) {
        console.error(error)
        nextRows.push({
          id: `recognize-${Date.now()}-${rowSeed += 1}`,
          selected: false,
          file,
          previewUrl: URL.createObjectURL(file),
          name: '',
          author: '',
          size: '',
          type: 'member',
          buyer: props.buyer || '',
          date: baseDate.value,
          ocrAmount: null,
          valueAmountText: '',
          rawText: '',
          errors: [error.message || '识别失败'],
          valid: false,
          sourceName: file.name,
        })
      }
    }
    rows.value = nextRows
    progressText.value = `识别完成：可入库 ${nextRows.filter((row) => row.valid).length}/${nextRows.length}`
  } finally {
    recognizing.value = false
  }
}

const handleClose = async () => {
  if (busy.value) return
  emit('update:visible', false)
  await resetState()
}

const handleConfirm = () => {
  if (!selectedValidRows.value.length) {
    showError('请先勾选可入库的图纸')
    return
  }

  const items = selectedValidRows.value.map((row) => {
    const rawAmount = Number(row.valueAmountText)
    const valueAmount =
      props.category === 'member' &&
      (row.type === 'member' || row.type === 'paid') &&
      row.valueAmountText !== '' &&
      Number.isFinite(rawAmount)
        ? Math.round(rawAmount * 100) / 100
        : null
    return {
      imageFile: row.file,
      name: String(row.name || '').trim(),
      author: String(row.author || '').trim(),
      size: String(row.size || '').trim(),
      type: row.type || 'member',
      buyer: String(row.buyer || props.buyer || '').trim(),
      date: String(row.date || '').trim(),
      completed: false,
      completedDate: '',
      isRepeat: false,
      reassembleDates: [],
      patternCategory: '',
      valueAmount,
      price: null,
    }
  })

  emit('import', {
    category: props.category,
    items,
  })
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      await resetState()
      return
    }
    baseDate.value = dayjs().format('YYYY-MM-DD')
  },
)
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(36, 24, 32, 0.45);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(1180px, 96vw);
  max-height: 90vh;
  overflow: hidden;
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

.meta-hint {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.base-date {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 13px;
}

.upload-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  padding: 22px 20px;
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

.btn-upload {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.stat-invalid {
  background: #fff0f2;
  color: #e85d6a;
}

.preview-panel {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

th,
td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  font-size: 12px;
  vertical-align: middle;
}

th {
  position: sticky;
  top: 0;
  background: var(--color-pale);
  color: var(--color-text-secondary);
  font-weight: 600;
  z-index: 1;
}

.col-check {
  width: 42px;
  text-align: center;
}

.col-thumb {
  width: 64px;
}

.thumb-btn {
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
}

.thumb {
  display: block;
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  transition: box-shadow 0.15s ease;
}

.thumb-btn:hover .thumb {
  box-shadow: 0 0 0 2px rgba(232, 145, 168, 0.45);
}

.cell-input,
.cell-select {
  box-sizing: border-box;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 12px;
}

.cell-input-sm {
  width: 88px;
}

.cell-input-date {
  width: 132px;
}

.row-error {
  background: #fff8f9;
}

.row-skip {
  opacity: 0.72;
}

.status-ok {
  color: #0d9488;
  font-weight: 600;
}

.status-error {
  color: #e85d6a;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border);
}

.btn-cancel,
.btn-primary {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-primary {
  border: none;
  background-image: var(--gradient-main);
  color: #fff;
}

.btn-primary:disabled,
.btn-cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
