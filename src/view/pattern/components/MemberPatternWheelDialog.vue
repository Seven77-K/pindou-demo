<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div class="header-text">
            <h4>转盘</h4>
            <p class="header-sub">从筛选后的未完成图纸中随机抽取一张</p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="filter-row">
            <div class="filter-item">
              <label>图纸</label>
              <el-select v-model="filters.listCategory" multiple collapse-tags collapse-tags-tooltip
                :max-collapse-tags="1" clearable placeholder="全部" popper-class="wheel-filter-popper"
                class="filter-select">
                <el-option v-for="opt in patternListOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
            <div class="filter-item">
              <label>购买人</label>
              <el-select v-model="filters.buyer" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="1"
                clearable placeholder="全部" popper-class="wheel-filter-popper" class="filter-select">
                <el-option v-for="opt in buyerOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="filter-item">
              <label>作者</label>
              <el-select v-model="filters.author" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="1"
                clearable filterable placeholder="全部" popper-class="wheel-filter-popper" class="filter-select">
                <el-option v-for="opt in authorOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="filter-item">
              <label>规格</label>
              <el-select v-model="filters.size" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="1"
                clearable placeholder="全部" popper-class="wheel-filter-popper" class="filter-select">
                <el-option v-for="opt in sizeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="filter-item">
              <label>类型</label>
              <el-select v-model="filters.type" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="1"
                clearable placeholder="全部" popper-class="wheel-filter-popper" class="filter-select">
                <el-option v-for="opt in patternTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
          </div>

          <p class="pool-summary">
            当前池内 <strong>{{ pool.length }}</strong> 张未完成图纸
          </p>

          <div class="wheel-main">
            <div class="wheel-stage">
              <div class="wheel-pointer" aria-hidden="true" />
              <div class="wheel" :class="{ 'wheel-spinning': spinning }" :style="wheelStyle">
                <svg v-if="pool.length" class="wheel-svg" viewBox="0 0 220 220">
                  <g transform="translate(110, 110)">
                    <path v-for="(item, index) in pool" :key="item.id" :d="slicePath(index, pool.length)"
                      :fill="sliceColor(index)" stroke="#fff" stroke-width="1.5" />
                    <text v-for="(item, index) in pool" v-show="pool.length <= 16" :key="`label-${item.id}`"
                      :transform="sliceLabelTransform(index, pool.length)" class="slice-label">
                      {{ truncateName(item.name) }}
                    </text>
                  </g>
                </svg>
                <div v-else class="wheel-empty">暂无符合条件的图纸</div>
              </div>
            </div>

            <div class="result-slot">
              <div class="result-card" :class="{ 'result-card-empty': !result }">
                <template v-if="result">
                  <div class="result-body">
                    <div class="result-text">
                      <span class="result-tag">抽中</span>
                      <strong>{{ result.name }}</strong>
                      <span class="result-meta">
                        {{ listCategoryLabel(result.wheelCategory) }} · {{ result.author || '—' }} · {{ result.size ||
                        '—' }} · {{ typeLabel(result.type) }}
                      </span>
                    </div>
                    <div class="result-thumb-wrap">
                      <img v-if="resultImage" :src="resultImage" :alt="result.name"
                        class="result-thumb result-thumb-clickable" title="点击查看大图" @click="openResultPreview" />
                      <span v-else-if="resultHasImage" class="result-thumb-placeholder">加载中…</span>
                      <span v-else class="result-thumb-placeholder">暂无图片</span>
                    </div>
                  </div>
                </template>
                <span v-else class="result-placeholder">抽中结果将显示在这里</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="handleClose">关闭</button>
          <button type="button" class="btn-spin" :disabled="!pool.length || spinning" @click="spinWheel">
            {{ spinning ? '转动中…' : '开始转盘' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <PatternPreviewDialog v-model:visible="previewVisible" :name="preview?.name" :image="preview?.image" />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  getPatternImage,
  hasPatternImageFlag,
  isPatternCompleted,
  loadPatternImage,
  patternTypeLabels,
  patternTypeOptions,
  sizeOptions,
} from '@/composables/usePatternData'
import { getSizeFilterCategory } from '@/utils/patternSize'
import PatternPreviewDialog from '@/view/pattern/components/PatternPreviewDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patterns: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible'])

const WHEEL_COLORS = [
  '#f2a0b0',
  '#7eb8e0',
  '#a898d8',
  '#e8b878',
  '#78c8b8',
  '#e890c0',
  '#8898e0',
  '#68b8c0',
  '#c898d0',
  '#88a8e0',
  '#f09888',
  '#98c0a0',
]

const patternListOptions = [
  { value: 'member', label: '会员图纸' },
  { value: 'normal', label: '普通图纸' },
]

const filters = reactive({
  listCategory: [],
  author: [],
  size: [],
  type: [],
  buyer: [],
})

const rotation = ref(0)
const spinning = ref(false)
const result = ref(null)
const preview = ref(null)
let spinTimer = null

const previewVisible = computed({
  get: () => Boolean(preview.value),
  set: (val) => {
    if (!val) preview.value = null
  },
})

const pendingPatterns = computed(() =>
  props.patterns.filter((item) => !isPatternCompleted(item)),
)

const listCategoryScopedPatterns = computed(() => {
  if (!filters.listCategory.length) return pendingPatterns.value
  return pendingPatterns.value.filter((item) => filters.listCategory.includes(item.wheelCategory))
})

const buyerOptions = computed(() =>
  [...new Set(listCategoryScopedPatterns.value.map((item) => item.buyer).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  ),
)

const buyerScopedPatterns = computed(() => {
  if (!filters.buyer.length) return listCategoryScopedPatterns.value
  return listCategoryScopedPatterns.value.filter((item) => filters.buyer.includes(item.buyer))
})

const authorOptions = computed(() =>
  [...new Set(buyerScopedPatterns.value.map((item) => item.author).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  ),
)

const pool = computed(() =>
  pendingPatterns.value.filter((item) => {
    if (filters.listCategory.length && !filters.listCategory.includes(item.wheelCategory)) return false
    if (filters.author.length && !filters.author.includes(item.author)) return false
    if (filters.size.length && !filters.size.includes(getSizeFilterCategory(item.size))) return false
    if (filters.type.length && !filters.type.includes(item.type)) return false
    if (filters.buyer.length && !filters.buyer.includes(item.buyer)) return false
    return true
  }),
)

const resultHasImage = computed(() => (result.value ? hasPatternImageFlag(result.value) : false))

const resultImage = computed(() => (result.value ? getPatternImage(result.value) : ''))

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
}))

const typeLabel = (type) => patternTypeLabels[type] || type || '—'

const listCategoryLabel = (category) =>
  patternListOptions.find((opt) => opt.value === category)?.label || '—'

const truncateName = (name) => {
  const text = String(name || '').trim()
  if (text.length <= 6) return text
  return `${text.slice(0, 5)}…`
}

const sliceColor = (index) => WHEEL_COLORS[index % WHEEL_COLORS.length]

const polarToCartesian = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
  }
}

const slicePath = (index, total) => {
  const radius = 100
  const angle = 360 / total
  const start = index * angle
  const end = start + angle
  const startPoint = polarToCartesian(start, radius)
  const endPoint = polarToCartesian(end, radius)
  const largeArc = angle > 180 ? 1 : 0
  return `M 0 0 L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`
}

const sliceLabelTransform = (index, total) => {
  const angle = (index + 0.5) * (360 / total)
  const point = polarToCartesian(angle, 62)
  return `translate(${point.x}, ${point.y}) rotate(${angle})`
}

const resetWheelState = () => {
  rotation.value = 0
  spinning.value = false
  result.value = null
  if (spinTimer) {
    clearTimeout(spinTimer)
    spinTimer = null
  }
}

const resetFilters = () => {
  filters.listCategory = []
  filters.author = []
  filters.size = []
  filters.type = []
  filters.buyer = []
}

const handleClose = () => {
  if (spinning.value) return
  preview.value = null
  emit('update:visible', false)
}

const openResultPreview = async () => {
  const item = result.value
  if (!item) return

  let image = getPatternImage(item)
  if (!image && item.hasImage) {
    image = await loadPatternImage(item.id, item.wheelCategory || 'member')
  }
  if (!image) return

  preview.value = {
    name: item.name,
    image,
  }
}

const spinWheel = () => {
  if (!pool.value.length || spinning.value) return

  const count = pool.value.length
  const winnerIndex = Math.floor(Math.random() * count)
  const segmentAngle = 360 / count
  const extraTurns = 5 + Math.floor(Math.random() * 3)
  const current = rotation.value % 360
  const targetOffset = 360 - (winnerIndex * segmentAngle + segmentAngle / 2)
  let delta = targetOffset - current
  if (delta <= 0) delta += 360

  spinning.value = true
  result.value = null
  rotation.value += extraTurns * 360 + delta

  spinTimer = window.setTimeout(() => {
    spinning.value = false
    result.value = pool.value[winnerIndex]
    spinTimer = null
  }, 4200)
}

watch(
  () => result.value,
  async (item) => {
    if (!item?.id || !item.hasImage || getPatternImage(item)) return
    await loadPatternImage(item.id, item.wheelCategory || 'member')
  },
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetFilters()
      resetWheelState()
    } else {
      resetWheelState()
    }
  },
)

watch(
  () => filters.listCategory,
  () => {
    if (!filters.buyer.length && !filters.author.length) return
    const allowedBuyers = new Set(buyerOptions.value)
    const nextBuyers = filters.buyer.filter((name) => allowedBuyers.has(name))
    if (nextBuyers.length !== filters.buyer.length) {
      filters.buyer = nextBuyers
    }
    if (!filters.author.length) return
    const allowedAuthors = new Set(authorOptions.value)
    const nextAuthors = filters.author.filter((name) => allowedAuthors.has(name))
    if (nextAuthors.length !== filters.author.length) {
      filters.author = nextAuthors
    }
  },
  { deep: true },
)

watch(
  () => filters.buyer,
  () => {
    if (!filters.author.length) return
    const allowed = new Set(authorOptions.value)
    const next = filters.author.filter((name) => allowed.has(name))
    if (next.length !== filters.author.length) {
      filters.author = next
    }
  },
  { deep: true },
)

watch(
  () => [filters.listCategory, filters.author, filters.size, filters.type, filters.buyer],
  () => {
    if (!spinning.value) {
      result.value = null
      rotation.value = 0
    }
  },
  { deep: true },
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
  padding: 24px;
  background: rgba(36, 24, 32, 0.42);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(800px, calc(100vw - 48px));
  max-height: min(90vh, 720px);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(82, 64, 74, 0.18);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
}

.header-text h4 {
  margin: 0;
  color: #3d2f38;
  font-size: 18px;
  font-weight: 600;
}

.header-sub {
  margin: 6px 0 0;
  color: #9a8a92;
  font-size: 12px;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #9a8a92;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 0 24px 16px;
  overflow: auto;
}

.wheel-main {
  display: flex;
  flex-direction: column;
  height: 404px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  min-height: 76px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #f0e4ea;
  border-radius: 10px;
  background: #faf7f9;
  box-sizing: border-box;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.filter-item label {
  flex-shrink: 0;
  color: #6e5660;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.filter-select {
  width: 100%;
}

.filter-item :deep(.el-select) {
  display: block;
  width: 100%;
  height: 32px;
}

.filter-item :deep(.el-select__wrapper) {
  width: 100%;
  height: 32px;
  min-height: 32px;
  max-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #eadde4 inset;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
}

.filter-item :deep(.el-select__wrapper:hover),
.filter-item :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #a83858 inset;
}

.filter-item :deep(.el-select__selection) {
  flex-wrap: nowrap;
  overflow: hidden;
}

.filter-item :deep(.el-select__placeholder) {
  color: #9a8a92;
  font-size: 13px;
}

.filter-item :deep(.el-tag) {
  max-width: 48px;
  height: 22px;
}

.filter-item :deep(.el-select__suffix) {
  flex-shrink: 0;
}

.filter-item :deep(.el-select__selected-item) {
  flex-shrink: 1;
  min-width: 0;
}

.pool-summary {
  margin: 0 0 16px;
  color: #6e5660;
  font-size: 13px;
}

.pool-summary strong {
  color: #a83858;
  font-size: 16px;
}

.wheel-stage {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 280px;
  margin: 0 auto;
}

.wheel-pointer {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 2;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 18px solid #a83858;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 4px rgba(168, 56, 88, 0.25));
}

.wheel {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 24px rgba(82, 64, 74, 0.12);
  transition: transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99);
  will-change: transform;
}

.wheel-spinning {
  pointer-events: none;
}

.wheel-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.slice-label {
  fill: #3d2f38;
  font-size: 9px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.wheel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
  color: #9a8a92;
  font-size: 14px;
  text-align: center;
}

.result-slot {
  flex-shrink: 0;
  height: 108px;
  margin-top: 16px;
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff5f8 0%, #faf0f5 100%);
  border: 1px solid #f0e4ea;
  text-align: center;
  box-sizing: border-box;
}

.result-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
}

.result-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.result-thumb-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #f0e4ea;
  overflow: hidden;
}

.result-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.result-thumb-clickable {
  cursor: zoom-in;
}

.result-thumb-placeholder {
  padding: 0 6px;
  color: #b8a8b0;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}

.result-card-empty {
  background: #faf7f9;
  border-style: dashed;
}

.result-placeholder {
  color: #b8a8b0;
  font-size: 13px;
}

.result-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: #a83858;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.result-card strong {
  color: #3d2f38;
  font-size: 18px;
}

.result-meta {
  color: #6e5660;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 24px 20px;
}

.btn-cancel,
.btn-spin {
  min-width: 88px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid #eadde4;
  background: #fff;
  color: #6e5660;
}

.btn-cancel:hover {
  background: #faf5f7;
}

.btn-spin {
  border: none;
  background-image: linear-gradient(135deg, #ffc8dd 0%, #f2a0b0 100%);
  color: #3d2f38;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.45);
}

.btn-spin:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

<style>
.wheel-filter-popper {
  z-index: 2100 !important;
}
</style>
