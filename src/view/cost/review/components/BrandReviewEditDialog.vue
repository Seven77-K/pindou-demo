<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <div>
            <h4>{{ brand }}</h4>
            <p class="header-sub">
              买过 {{ meta.count || 0 }} 次 · {{ formatCostAmount(meta.amount || 0) }}
              <template v-if="meta.lastDate"> · 最近 {{ meta.lastDate }}</template>
            </p>
          </div>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <div class="basics">
            <div class="basics-top">
              <div class="field">
                <span class="field-label">类别</span>
                <span class="pack-readonly">{{ meta.packTypeLabel || '—' }}</span>
              </div>

              <div class="field">
                <span class="field-label">是否会再回购</span>
                <div class="seg">
                  <button
                    type="button"
                    class="seg-btn"
                    :class="{ active: form.willRepurchase === true }"
                    @click="form.willRepurchase = true"
                  >
                    会
                  </button>
                  <button
                    type="button"
                    class="seg-btn"
                    :class="{ active: form.willRepurchase === false, danger: true }"
                    @click="form.willRepurchase = false"
                  >
                    否
                  </button>
                </div>
              </div>
            </div>

            <p v-if="form.willRepurchase === false" class="hint">
              记一笔时该品牌不再出现在下拉选项
            </p>

            <label class="field">
              <span class="field-label">总体评价</span>
              <textarea
                v-model="form.comment"
                rows="2"
                maxlength="200"
                placeholder="手感、色差、发货…"
              />
            </label>

            <div class="field-row">
              <label class="field">
                <span class="field-label">优点</span>
                <input v-model="form.pros" maxlength="80" placeholder="可选" />
              </label>
              <label class="field">
                <span class="field-label">缺点</span>
                <input v-model="form.cons" maxlength="80" placeholder="可选" />
              </label>
            </div>
          </div>

          <div class="colors">
            <div class="colors-head">
              <div class="colors-kind-tabs">
                <button
                  type="button"
                  class="kind-tab"
                  :class="{ active: colorKind === 'repurchase' }"
                  @click="colorKind = 'repurchase'"
                >
                  回购色号
                </button>
                <button
                  type="button"
                  class="kind-tab"
                  :class="{ active: colorKind === 'banned' }"
                  @click="colorKind = 'banned'"
                >
                  禁选色号
                </button>
              </div>
              <span class="colors-meta">已选 {{ activeColorList.length }}</span>
            </div>

            <div class="series-tabs">
              <button
                v-for="group in BEAD_COLOR_SERIES"
                :key="group.letter"
                type="button"
                class="series-tab"
                :class="{ active: activeSeries === group.letter }"
                @click="activeSeries = group.letter"
              >
                {{ group.letter }}
              </button>
              <input
                v-model.trim="colorQuery"
                class="color-search"
                placeholder="搜色号"
              />
            </div>

            <p class="series-name">{{ activeSeriesLabel }}</p>

            <div class="palette-grid">
              <button
                v-for="color in visibleColors"
                :key="color.code"
                type="button"
                class="color-tile"
                :class="{
                  selected: selectedSet.has(color.code),
                  banned: colorKind === 'banned' && selectedSet.has(color.code),
                }"
                :style="{
                  background: color.hex,
                  color: getBeadColorLabelColor(color.hex),
                }"
                :title="color.code"
                @click="toggleColor(color.code)"
              >
                <span>{{ color.code }}</span>
                <em v-if="selectedSet.has(color.code)">✓</em>
              </button>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-secondary" @click="handleClose">取消</button>
          <button type="button" class="btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  BEAD_COLOR_SERIES,
  BEAD_COLORS_221,
  getBeadColorLabelColor,
  normalizeRepurchaseColors,
} from '@/constants/beadColors221'
import { formatCostAmount } from '@/composables/useCostData'

const props = defineProps({
  visible: { type: Boolean, default: false },
  brand: { type: String, default: '' },
  review: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'save'])

const activeSeries = ref('A')
const colorQuery = ref('')
const colorKind = ref('repurchase')

const form = reactive({
  comment: '',
  pros: '',
  cons: '',
  willRepurchase: true,
  repurchaseColors: [],
  bannedColors: [],
})

const meta = reactive({
  count: 0,
  amount: 0,
  lastDate: '',
  packTypeLabel: '—',
})

watch(
  () => [props.visible, props.review],
  () => {
    if (!props.visible || !props.review) return
    form.comment = props.review.comment || ''
    form.pros = props.review.pros || ''
    form.cons = props.review.cons || ''
    form.willRepurchase = props.review.willRepurchase !== false
    form.repurchaseColors = normalizeRepurchaseColors(props.review.repurchaseColors)
    form.bannedColors = normalizeRepurchaseColors(props.review.bannedColors)
    meta.count = props.review.count || 0
    meta.amount = props.review.amount || 0
    meta.lastDate = props.review.lastDate || ''
    meta.packTypeLabel = props.review.packTypeLabel || '—'
    colorQuery.value = ''
    colorKind.value = 'repurchase'
    activeSeries.value = 'A'
  },
  { immediate: true },
)

const activeColorList = computed(() =>
  colorKind.value === 'banned' ? form.bannedColors : form.repurchaseColors,
)

const selectedSet = computed(() => new Set(activeColorList.value))

const activeSeriesLabel = computed(() => {
  const group = BEAD_COLOR_SERIES.find((item) => item.letter === activeSeries.value)
  return group ? `${group.letter} · ${group.name}（${group.count}）` : ''
})

const visibleColors = computed(() => {
  const q = colorQuery.value.toUpperCase()
  if (q) {
    return BEAD_COLORS_221.filter((color) => color.code.includes(q))
  }
  const group = BEAD_COLOR_SERIES.find((item) => item.letter === activeSeries.value)
  return group?.colors || []
})

const sortColorCodes = (list) => {
  list.sort((a, b) => {
    const ma = a.match(/^([A-HM])(\d+)$/)
    const mb = b.match(/^([A-HM])(\d+)$/)
    if (!ma || !mb) return a.localeCompare(b)
    if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1])
    return Number(ma[2]) - Number(mb[2])
  })
}

const toggleColor = (code) => {
  const list = activeColorList.value
  const idx = list.indexOf(code)
  if (idx >= 0) {
    list.splice(idx, 1)
    return
  }
  list.push(code)
  sortColorCodes(list)
  // 与另一侧互斥
  const other = colorKind.value === 'banned' ? form.repurchaseColors : form.bannedColors
  const otherIdx = other.indexOf(code)
  if (otherIdx >= 0) other.splice(otherIdx, 1)
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save', {
    brand: props.brand,
    comment: form.comment,
    pros: form.pros,
    cons: form.cons,
    willRepurchase: form.willRepurchase !== false,
    repurchaseColors: normalizeRepurchaseColors(form.repurchaseColors),
    bannedColors: normalizeRepurchaseColors(form.bannedColors),
  })
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(40, 24, 32, 0.45);
}

.dialog-box {
  display: flex;
  flex-direction: column;
  width: min(680px, 96vw);
  max-height: 92vh;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(82, 64, 74, 0.16);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 16px;
}

.header-sub {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #999;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.basics,
.colors {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.basics-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.pack-readonly {
  display: inline-flex;
  align-items: center;
  height: 28px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.seg {
  display: inline-flex;
  gap: 0;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #faf7f9;
  width: fit-content;
}

.seg-btn {
  min-width: 48px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-regular);
  font-size: 13px;
  cursor: pointer;
}

.seg-btn.active {
  background: #fff;
  color: var(--color-accent);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(82, 64, 74, 0.08);
}

.seg-btn.danger.active {
  color: #c45c6a;
}

.hint {
  margin: 0;
  color: #c45c6a;
  font-size: 12px;
}

.field textarea,
.field input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #faf7f9;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  resize: none;
}

.field textarea:focus,
.field input:focus,
.color-search:focus {
  border-color: var(--color-accent);
  background: #fff;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.colors-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.colors-kind-tabs {
  display: flex;
  gap: 4px;
  padding: 2px;
  border-radius: 8px;
  background: var(--color-pale);
}

.kind-tab {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.kind-tab.active {
  background: #fff;
  color: var(--color-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.colors-meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.series-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.series-tab {
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  color: var(--color-text-regular);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.series-tab.active {
  border-color: var(--color-accent);
  background: rgba(224, 120, 144, 0.12);
  color: var(--color-accent);
}

.color-search {
  width: 88px;
  height: 28px;
  margin-left: auto;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #faf7f9;
  color: var(--color-text-primary);
  font-size: 12px;
  outline: none;
}

.series-name {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

/* 固定 8 列：A26/B32/C29 都是 4 行，高度稳定不空一截 */
.palette-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
  min-height: calc(4 * 36px + 3 * 6px);
}

.color-tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.color-tile:hover {
  filter: brightness(0.97);
}

.color-tile.selected {
  box-shadow:
    0 0 0 1px #fff,
    0 0 0 2px var(--color-accent);
}

.color-tile.selected.banned {
  box-shadow:
    0 0 0 1px #fff,
    0 0 0 2px #c45c6a;
}

.color-tile em {
  position: absolute;
  top: 2px;
  right: 4px;
  font-style: normal;
  font-size: 10px;
  line-height: 1;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--color-border);
}

.btn-secondary,
.btn-primary {
  height: 32px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary {
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-regular);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

@media (max-width: 560px) {
  .basics-top,
  .field-row {
    grid-template-columns: 1fr;
  }

  .palette-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    min-height: calc(6 * 36px + 5 * 6px);
  }

  .color-search {
    margin-left: 0;
    width: 100%;
  }
}
</style>
