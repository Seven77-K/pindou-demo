<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <h4>{{ mode === 'create' ? '上传图纸' : '编辑图纸' }}</h4>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <form class="dialog-form" @submit.prevent="handleSubmit">
          <div v-if="mode === 'create'" class="dialog-tabs">
            <button type="button" class="dialog-tab" :class="{ 'dialog-tab-active': form.isMember }"
              @click="form.isMember = true">
              会员图纸
            </button>
            <button type="button" class="dialog-tab" :class="{ 'dialog-tab-active': !form.isMember }"
              @click="form.isMember = false">
              普通图纸
            </button>
          </div>
          <div v-else class="dialog-meta">
            <span class="meta-tag">{{ form.isMember ? '会员图纸' : '普通图纸' }}</span>
          </div>

          <div class="type-toggle">
            <span class="type-label">图纸类型</span>
            <button v-for="opt in formTypeOptions" :key="opt.value" type="button" class="type-btn"
              :class="{ 'type-btn-active': form.type === opt.value }" @click="form.type = opt.value">
              {{ opt.label }}
            </button>
          </div>

          <div class="form-grid">
            <div class="form-item form-span-2">
              <label :class="{ 'label-required': mode === 'create' }">图纸名称</label>
              <el-input v-model="form.name" placeholder="请输入图纸名称" clearable />
            </div>

            <div class="form-item form-span-2">
              <label>图纸图片</label>
              <div class="upload-wrap">
                <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="onImageChange">
                  <button type="button" class="btn-upload">选择图片</button>
                </el-upload>
                <span class="upload-filename">{{ imageStatusText }}</span>
                <img v-if="imagePreview" class="form-thumb" :src="imagePreview" alt="预览" @click="emitPreview" />
                <button v-if="canClearImage" type="button" class="btn-clear-image" @click="clearImage">
                  删除图片
                </button>
              </div>
            </div>

            <div class="form-item">
              <label :class="{ 'label-required': mode === 'create' }">图纸作者</label>
              <div class="field-combobox" :class="{ 'field-combobox-clearable': form.author }">
                <input v-model="form.author" type="text" placeholder="请选择或输入作者" autocomplete="off"
                  @focus="showAuthorList = true" @input="showAuthorList = true" @blur="hideAuthorListDelayed" />
                <button v-if="form.author" type="button" class="field-combobox-clear" tabindex="-1" aria-label="清除作者"
                  @mousedown.prevent="clearAuthor">
                  ×
                </button>
                <button type="button" class="field-combobox-toggle" tabindex="-1" aria-label="展开作者列表"
                  @mousedown.prevent="toggleAuthorList">
                  ▼
                </button>
                <ul v-if="showAuthorList && filteredAuthorOptions.length" class="field-combobox-list">
                  <li v-for="author in filteredAuthorOptions" :key="author" @mousedown.prevent="selectAuthor(author)">
                    {{ author }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="form-item">
              <label :class="{ 'label-required': mode === 'create' }">规格</label>
              <el-input v-model="form.size" placeholder="如 100*160" clearable />
            </div>

            <div class="form-item">
              <label>图纸类别</label>
              <div class="field-combobox" :class="{ 'field-combobox-clearable': form.patternCategory }">
                <input v-model="form.patternCategory" type="text" placeholder="请选择或输入类别" autocomplete="off"
                  @focus="showCategoryList = true" @input="showCategoryList = true" @blur="hideCategoryListDelayed" />
                <button v-if="form.patternCategory" type="button" class="field-combobox-clear" tabindex="-1"
                  aria-label="清除类别" @mousedown.prevent="clearCategory">
                  ×
                </button>
                <button type="button" class="field-combobox-toggle" tabindex="-1" aria-label="展开类别列表"
                  @mousedown.prevent="toggleCategoryList">
                  ▼
                </button>
                <ul v-if="showCategoryList && filteredCategoryOptions.length" class="field-combobox-list">
                  <li v-for="category in filteredCategoryOptions" :key="category"
                    @mousedown.prevent="selectCategory(category)">
                    {{ category }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="form-item">
              <label>购买人</label>
              <el-select v-model="form.buyer" placeholder="请选择" clearable class="field-full">
                <el-option v-for="buyer in buyerOptions" :key="buyer" :label="buyer" :value="buyer" />
              </el-select>
            </div>

            <div v-if="!form.isMember" class="form-item">
              <label>价格</label>
              <el-input v-model="form.price" placeholder="请输入价格" clearable class="field-full" @input="onPriceInput" />
            </div>

            <div v-if="form.isMember" class="form-item">
              <label>金额</label>
              <el-input v-model="form.valueAmount" placeholder="请输入金额" clearable class="field-full"
                @input="onValueAmountInput" />
            </div>

            <div class="form-item">
              <label>是否完成</label>
              <el-select v-model="form.completed" class="field-full" @change="onCompletedChange">
                <el-option label="已完成" :value="true" />
                <el-option label="未完成" :value="false" />
              </el-select>
            </div>

            <div v-if="form.completed" class="form-item">
              <label>完成日期</label>
              <el-date-picker v-model="form.completedDate" type="date" value-format="YYYY-MM-DD"
                placeholder="选择完成日期" :shortcuts="dateShortcuts" popper-class="dialog-field-popper"
                class="field-full" />
            </div>

            <div class="form-item">
              <label>是否重复拼</label>
              <el-select v-model="form.isRepeat" class="field-full" @change="onIsRepeatChange">
                <el-option label="否" :value="false" />
                <el-option label="是" :value="true" />
              </el-select>
            </div>

            <div v-if="form.isRepeat" class="form-item form-item-block">
              <label>重新拼日期</label>
              <div class="reassemble-box">
                <div v-if="form.reassembleDates.length" class="reassemble-list">
                  <div
                    v-for="(date, index) in form.reassembleDates"
                    :key="`${date}-${index}`"
                    class="reassemble-row"
                  >
                    <span>{{ date }}</span>
                    <button type="button" class="link-danger" @click="removeReassembleDate(index)">
                      删除
                    </button>
                  </div>
                </div>
                <p v-else class="reassemble-empty">暂无重拼日期，请主动添加</p>
                <div class="reassemble-add">
                  <el-date-picker
                    v-model="pendingReassembleDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择重拼日期"
                    :shortcuts="dateShortcuts"
                    popper-class="dialog-field-popper"
                    class="field-full"
                  />
                  <button type="button" class="btn-add-date" @click="addReassembleDate">添加</button>
                </div>
              </div>
            </div>

            <div class="form-item">
              <label>图纸日期</label>
              <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期"
                :shortcuts="dateShortcuts" popper-class="dialog-field-popper" clearable class="field-full" />
            </div>
          </div>

          <div v-if="mode === 'create'" class="quick-paste">
            <div class="quick-paste-head">
              <span class="quick-paste-title">模糊填入</span>
              <span class="quick-paste-hint">按 Tab 分隔，顺序：{{ quickPasteHint }}</span>
            </div>
            <textarea v-model="quickPasteText" class="quick-paste-input" rows="2"
              placeholder="例如：小蓝帕恰狗	念念	68*104	Dora	免费	晴儿	否	2026/7/7" />
            <button type="button" class="btn-quick-paste" @click="applyQuickPaste">填入表单</button>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-cancel" @click="handleClose">取消</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  buyerOptions,
  patternTypeOptions,
  usePatternData,
} from '@/composables/usePatternData'
import { useAuthorAmounts } from '@/composables/useAuthorAmounts'
import { useMessage } from '@/composables/useMessage'
import {
  buildAuthorFrequencyMap,
  getPatternQuickPasteHint,
  parsePatternQuickPaste,
  resolveAuthorName,
} from '@/utils/patternExcel'
import {
  collectAuthorPaidAmountRefs,
  getMemberValueAmountByAuthorPaid,
} from '@/utils/patternSize'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  saving: { type: Boolean, default: false },
  defaultCategory: { type: String, default: 'member' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit', 'preview'])

const { showError, showSuccess } = useMessage()
const { memberPatterns, normalPatterns } = usePatternData()
const { listAuthorNames } = useAuthorAmounts()

const imageFile = ref(null)
const imagePreview = ref('')
const imageCleared = ref(false)
const showAuthorList = ref(false)
const showCategoryList = ref(false)
const quickPasteText = ref('')
const form = ref(createEmptyForm())
/** 上次自动填入的会员金额，用于作者/规格变化时覆盖自动值、不覆盖手填 */
const lastAutoValueAmount = ref('')

const canClearImage = computed(() => {
  if (imageCleared.value) return false
  if (imagePreview.value || imageFile.value) return true
  return props.mode === 'edit' && Boolean(props.editRecord?.hasImage)
})

const imageStatusText = computed(() => {
  if (imageCleared.value) return '已删除图片（保存后生效）'
  if (imageFile.value?.name) return imageFile.value.name
  if (imagePreview.value || (props.mode === 'edit' && props.editRecord?.hasImage)) {
    return '已有图片'
  }
  return '未选择文件'
})

const formTypeOptions = computed(() =>
  form.value.isMember
    ? patternTypeOptions
    : patternTypeOptions.filter((opt) => opt.value !== 'member')
)

const quickPasteHint = computed(() =>
  getPatternQuickPasteHint(form.value.isMember ? 'member' : 'normal'),
)

const authorOptions = computed(() => {
  const list = form.value.isMember
    ? memberPatterns.value
    : [...memberPatterns.value, ...normalPatterns.value]
  const set = new Set(list.map((item) => item.author).filter(Boolean))
  if (form.value.isMember) {
    listAuthorNames(form.value.buyer?.trim()).forEach((name) => set.add(name))
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

/**
 * 仅汇总「当前类型 + 购买人」下仍在用的图纸类别。
 * 例如小琳会员图纸里的类别，不会出现在晴儿/普通图纸的上传下拉中。
 */
const categoryOptions = computed(() => {
  const list = form.value.isMember
    ? memberPatterns.value.filter((item) => {
        const buyer = String(form.value.buyer || '').trim()
        if (!buyer) return true
        return String(item.buyer || '').trim() === buyer
      })
    : normalPatterns.value
  return [
    ...new Set(
      list.map((item) => String(item.patternCategory || '').trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

/** 下拉选项包含当前值，编辑时也能正确显示和选择 */
const authorSelectOptions = computed(() => {
  const set = new Set(authorOptions.value)
  const current = form.value.author?.trim()
  if (current) set.add(current)
  return [...set]
})

const filteredAuthorOptions = computed(() => {
  const keyword = form.value.author?.trim().toLowerCase() || ''
  return authorSelectOptions.value.filter(
    (item) => !keyword || item.toLowerCase().includes(keyword)
  )
})

const filteredCategoryOptions = computed(() => {
  const keyword = form.value.patternCategory?.trim().toLowerCase() || ''
  return categoryOptions.value.filter(
    (item) => !keyword || item.toLowerCase().includes(keyword)
  )
})

let hideListTimer = null

const hideAuthorListDelayed = () => {
  hideListTimer = setTimeout(() => {
    showAuthorList.value = false
  }, 150)
}

const hideCategoryListDelayed = () => {
  hideListTimer = setTimeout(() => {
    showCategoryList.value = false
  }, 150)
}

const toggleAuthorList = () => {
  clearTimeout(hideListTimer)
  showAuthorList.value = !showAuthorList.value
}

const toggleCategoryList = () => {
  clearTimeout(hideListTimer)
  showCategoryList.value = !showCategoryList.value
}

const selectAuthor = (author) => {
  clearTimeout(hideListTimer)
  form.value.author = author
  showAuthorList.value = false
}

const selectCategory = (category) => {
  clearTimeout(hideListTimer)
  form.value.patternCategory = category
  showCategoryList.value = false
}

const clearAuthor = () => {
  clearTimeout(hideListTimer)
  form.value.author = ''
  showAuthorList.value = false
}

const clearCategory = () => {
  clearTimeout(hideListTimer)
  form.value.patternCategory = ''
  showCategoryList.value = false
}

const dateShortcuts = [
  {
    text: '今天',
    value: () => new Date(),
  },
]

function formatToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function createEmptyForm(isMember = props.defaultCategory === 'member') {
  return {
    isMember,
    type: isMember ? 'member' : 'free',
    name: '',
    image: '',
    author: '',
    size: '',
    patternCategory: '',
    buyer: '晴儿',
    price: '',
    valueAmount: '',
    completed: false,
    completedDate: '',
    isRepeat: false,
    reassembleDates: [],
    date: '',
  }
}

const pendingReassembleDate = ref('')

const onCompletedChange = (completed) => {
  if (completed) {
    if (!form.value.completedDate) {
      form.value.completedDate = formatToday()
    }
  } else {
    form.value.completedDate = ''
  }
}

const onIsRepeatChange = (isRepeat) => {
  if (!isRepeat) {
    form.value.reassembleDates = []
    pendingReassembleDate.value = ''
  }
}

const addReassembleDate = () => {
  const date = String(pendingReassembleDate.value || '').trim()
  if (!date) {
    showError('请先选择重拼日期')
    return
  }
  if (form.value.reassembleDates.includes(date)) {
    showError('该日期已添加')
    return
  }
  form.value.reassembleDates = [...form.value.reassembleDates, date].sort((a, b) =>
    b.localeCompare(a),
  )
  pendingReassembleDate.value = ''
}

const removeReassembleDate = (index) => {
  form.value.reassembleDates = form.value.reassembleDates.filter((_, i) => i !== index)
}

const resetImageState = () => {
  if (imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imageFile.value = null
  imagePreview.value = ''
}

const suggestMemberValueAmount = () => {
  if (!form.value.isMember || form.value.type !== 'member') return null
  if (!form.value.author?.trim() || !form.value.size?.trim()) return null
  const paidRefs = collectAuthorPaidAmountRefs(memberPatterns.value, form.value.author)
  return getMemberValueAmountByAuthorPaid(form.value.size, paidRefs)
}

const maybeAutoFillMemberValueAmount = ({ force = false } = {}) => {
  if (props.mode === 'edit') return
  if (!form.value.isMember || form.value.type !== 'member') return
  const suggested = suggestMemberValueAmount()
  if (suggested == null) return
  const next = String(suggested)
  const current = String(form.value.valueAmount ?? '')
  if (
    force ||
    !current ||
    current === lastAutoValueAmount.value
  ) {
    form.value.valueAmount = next
    lastAutoValueAmount.value = next
  }
}

const initForm = () => {
  imageCleared.value = false
  showAuthorList.value = false
  showCategoryList.value = false
  quickPasteText.value = ''
  pendingReassembleDate.value = ''
  lastAutoValueAmount.value = ''
  resetImageState()
  if (props.mode === 'edit' && props.editRecord) {
    const completed = props.editRecord.completed === true
    const isRepeat = props.editRecord.isRepeat === true
    form.value = {
      ...props.editRecord,
      isMember: props.defaultCategory === 'member',
      completed,
      completedDate: completed ? props.editRecord.completedDate || '' : '',
      isRepeat,
      reassembleDates: isRepeat
        ? [...(props.editRecord.reassembleDates || [])].filter(Boolean)
        : [],
      price:
        props.defaultCategory === 'member' || props.editRecord.price == null
          ? ''
          : String(props.editRecord.price),
      valueAmount:
        props.defaultCategory !== 'member' || props.editRecord.valueAmount == null
          ? ''
          : String(props.editRecord.valueAmount),
    }
    imagePreview.value = props.editRecord.image || ''
  } else {
    form.value = createEmptyForm(props.defaultCategory === 'member')
  }
}

watch(
  () => [props.visible, props.mode, props.editRecord, props.defaultCategory],
  ([visible]) => {
    if (visible) initForm()
  }
)

watch(
  () => form.value.isMember,
  (isMember) => {
    if (!isMember && form.value.type === 'member') {
      form.value.type = 'free'
    }
  }
)

watch(
  () => [
    props.visible,
    props.mode,
    form.value.isMember,
    form.value.type,
    form.value.author,
    form.value.size,
  ],
  ([visible]) => {
    if (!visible) return
    maybeAutoFillMemberValueAmount()
  },
)

const handleClose = () => {
  if (props.saving) return
  emit('update:visible', false)
  resetImageState()
}

const onImageChange = (uploadFile) => {
  const file = uploadFile?.raw
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showError('请选择图片文件')
    return
  }

  if (imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }

  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  imageCleared.value = false
}

const clearImage = () => {
  resetImageState()
  imageCleared.value = true
}

const onPriceInput = (value) => {
  const text = String(value ?? '').replace(/[^\d.]/g, '')
  const parts = text.split('.')
  form.value.price = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : text
}

const onValueAmountInput = (value) => {
  const text = String(value ?? '').replace(/[^\d.]/g, '')
  const parts = text.split('.')
  form.value.valueAmount = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : text
}

const emitPreview = () => {
  emit('preview', {
    name: form.value.name || '图纸预览',
    image: imagePreview.value,
  })
}

const validateCreateForm = () => {
  if (!form.value.name?.trim()) {
    showError('请填写图纸名称')
    return false
  }
  if (!form.value.author?.trim()) {
    showError('请填写图纸作者')
    return false
  }
  if (!form.value.size?.trim()) {
    showError('请填写规格')
    return false
  }
  return true
}

const resolveFormAuthor = (input) => {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const list = form.value.isMember
    ? memberPatterns.value
    : [...memberPatterns.value, ...normalPatterns.value]
  const existing = [
    ...new Set([
      ...list.map((item) => String(item.author || '').trim()).filter(Boolean),
      ...(form.value.isMember ? listAuthorNames(form.value.buyer?.trim()) : []),
    ]),
  ]
  return resolveAuthorName(raw, existing, buildAuthorFrequencyMap(list))
}

const applyQuickPaste = () => {
  const category = form.value.isMember ? 'member' : 'normal'
  const result = parsePatternQuickPaste(quickPasteText.value, category)
  if (!result.ok) {
    showError(result.error)
    return
  }

  const row = result.data
  const rawAuthor = row.author
  const resolvedAuthor = resolveFormAuthor(rawAuthor)
  form.value.name = row.name
  form.value.author = resolvedAuthor
  form.value.size = row.size
  form.value.patternCategory = row.patternCategory
  form.value.type = row.type
  form.value.buyer = row.buyer || '晴儿'
  form.value.completed = row.completed === true
  form.value.completedDate = row.completed === true ? formatToday() : ''
  form.value.date = row.date || ''
  if (!form.value.isMember) {
    form.value.price = row.price == null ? '' : String(row.price)
  } else if (row.valueAmount != null) {
    form.value.valueAmount = String(row.valueAmount)
    lastAutoValueAmount.value = ''
  } else {
    form.value.valueAmount = ''
    lastAutoValueAmount.value = ''
    maybeAutoFillMemberValueAmount({ force: true })
  }
  if (resolvedAuthor && rawAuthor && resolvedAuthor !== String(rawAuthor).trim()) {
    showSuccess(`已填入表单；作者「${String(rawAuthor).trim()}」已识别为「${resolvedAuthor}」`)
  } else {
    showSuccess('已填入表单')
  }
}

const handleSubmit = () => {
  if (props.mode === 'create' && !validateCreateForm()) return

  const { isMember, ...data } = form.value
  if (!isMember && data.type === 'member') {
    data.type = 'free'
  }
  const rawAuthor = String(data.author || '').trim()
  data.author = resolveFormAuthor(rawAuthor)
  if (rawAuthor && data.author && data.author !== rawAuthor) {
    form.value.author = data.author
    showSuccess(`作者「${rawAuthor}」已识别为「${data.author}」`)
  }
  data.patternCategory = String(data.patternCategory || '').trim()
  data.buyer = String(data.buyer || '').trim() || '晴儿'
  if (data.completed) {
    data.completedDate = data.completedDate || formatToday()
  } else {
    data.completedDate = ''
  }
  data.isRepeat = data.isRepeat === true
  data.reassembleDates = data.isRepeat
    ? [...(data.reassembleDates || [])].filter(Boolean).sort((a, b) => b.localeCompare(a))
    : []
  if (isMember) {
    delete data.price
    if (data.valueAmount !== '' && data.valueAmount != null) {
      const num = Number(data.valueAmount)
      data.valueAmount = Number.isFinite(num) ? num : null
    } else {
      data.valueAmount = null
    }
  } else {
    delete data.valueAmount
    if (data.price !== '' && data.price != null) {
      const num = Number(data.price)
      data.price = Number.isFinite(num) ? num : null
    } else {
      data.price = null
    }
  }

  emit('submit', {
    isMember,
    data,
    imageFile: imageFile.value,
    imageCleared: imageCleared.value,
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
  width: 520px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.dialog-form {
  padding: 16px 20px 20px;
}

.dialog-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 3px;
  border-radius: 8px;
  background: var(--color-pale);
}

.dialog-tab {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-tab-active {
  background: #fff;
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(250, 208, 196, 0.35);
}

.dialog-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-tag {
  padding: 4px 12px;
  border-radius: 6px;
  background: var(--color-pale);
  color: var(--color-text-regular);
  font-size: 12px;
}

.type-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.type-label {
  color: var(--color-text-regular);
  font-size: 13px;
}

.type-btn {
  padding: 4px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn-active {
  border-color: var(--color-accent);
  background: var(--color-pale);
  color: var(--color-accent);
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-span-2 {
  grid-column: span 2;
}

.form-item-block {
  grid-column: span 2;
}

.reassemble-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #faf7f9;
}

.reassemble-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 140px;
  overflow: auto;
}

.reassemble-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 13px;
}

.reassemble-empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.reassemble-add {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.btn-add-date {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-add-date:hover {
  background: var(--color-accent-deep);
}

.link-danger {
  border: none;
  background: transparent;
  color: #c45c78;
  font-size: 12px;
  cursor: pointer;
}

.link-danger:hover {
  text-decoration: underline;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-regular);
  font-size: 13px;
}

.label-required::before {
  content: '*';
  margin-right: 4px;
  color: #e85d6a;
}

.upload-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.btn-upload {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-pale);
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-clear-image {
  padding: 0 2px;
  border: none;
  background: none;
  color: #e85d6a;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.btn-clear-image:hover {
  opacity: 0.85;
}

.upload-filename {
  flex: 1;
  min-width: 120px;
  color: var(--color-text-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: contain;
  background: var(--color-pale);
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.form-thumb:hover {
  transform: scale(1.08);
}

.field-full {
  width: 100%;
}

.field-combobox {
  position: relative;
}

.field-combobox input {
  width: 100%;
  height: 32px;
  padding: 0 32px 0 11px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;
}

.field-combobox-clearable input {
  padding-right: 56px;
}

.field-combobox input:focus {
  border-color: var(--color-accent);
}

.field-combobox-clear {
  position: absolute;
  top: 0;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.field-combobox-clear:hover {
  color: var(--color-text-primary);
}

.field-combobox-toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 10px;
  cursor: pointer;
}

.field-combobox-list {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 10;
  max-height: 180px;
  margin: 0;
  padding: 4px 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  list-style: none;
  overflow-y: auto;
}

.field-combobox-list li {
  padding: 8px 12px;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
}

.field-combobox-list li:hover {
  background: var(--color-pale);
  color: var(--color-accent);
}

.form-item :deep(.el-input__wrapper),
.form-item :deep(.el-select__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.form-item :deep(.el-input__wrapper:hover),
.form-item :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.form-item :deep(.el-input__wrapper.is-focus),
.form-item :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.form-item :deep(.el-input__inner) {
  color: var(--color-text-primary);
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.quick-paste {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--color-border);
}

.quick-paste-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.quick-paste-title {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.quick-paste-hint {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.quick-paste-input {
  width: 100%;
  min-height: 56px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-pale);
  color: var(--color-text-primary);
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;
}

.quick-paste-input:focus {
  border-color: var(--color-accent);
  background: #fff;
}

.btn-quick-paste {
  margin-top: 8px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-quick-paste:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
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
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 14px;
  cursor: pointer;
}
</style>

<style>
.dialog-field-popper {
  z-index: 2100 !important;
}
</style>
