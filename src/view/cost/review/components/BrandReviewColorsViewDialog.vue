<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask" @click="handleClose">
      <div class="dialog-box" v-dialog-drag @click.stop>
        <div class="dialog-header">
          <h4>{{ titleText }}</h4>
          <button type="button" class="dialog-close" @click="handleClose">×</button>
        </div>

        <div class="dialog-body">
          <p class="brand-line">{{ hintText }}</p>
          <BeadColorLibraryGrid
            :selected-colors="draftColors"
            @toggle="toggleColor"
          />
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-secondary btn-reset" @click="handleReset">重置</button>
          <div class="footer-actions">
            <button type="button" class="btn-secondary" @click="handleClose">取消</button>
            <button type="button" class="btn-primary" @click="handleSave">保存</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeRepurchaseColors } from '@/constants/beadColors221'
import BeadColorLibraryGrid from './BeadColorLibraryGrid.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  brand: { type: String, default: '' },
  selectedColors: { type: Array, default: () => [] },
  /** 筛选模式：文案提示不同 */
  filterMode: { type: Boolean, default: false },
  /** repurchase | banned */
  colorKind: { type: String, default: 'repurchase' },
})

const emit = defineEmits(['update:visible', 'save'])

const draftColors = ref([])

const kindLabel = computed(() => (props.colorKind === 'banned' ? '禁选色号' : '回购色号'))

const titleText = computed(() => {
  if (props.filterMode) return `筛选 · ${kindLabel.value}`
  return kindLabel.value
})

const hintText = computed(() => {
  if (props.filterMode) {
    return `已选 ${draftColors.value.length} 色 · 可多选，点击色块选择/取消`
  }
  const name = props.brand || '品牌'
  return `${name} · 已选 ${draftColors.value.length} 色 · 点击色块选择/取消`
})

watch(
  () => [props.visible, props.selectedColors],
  () => {
    if (!props.visible) return
    draftColors.value = normalizeRepurchaseColors(props.selectedColors)
  },
  { immediate: true },
)

const toggleColor = (code) => {
  const list = draftColors.value
  const idx = list.indexOf(code)
  if (idx >= 0) {
    list.splice(idx, 1)
    return
  }
  list.push(code)
  list.sort((a, b) => {
    const ma = a.match(/^([A-HM])(\d+)$/)
    const mb = b.match(/^([A-HM])(\d+)$/)
    if (!ma || !mb) return a.localeCompare(b)
    if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1])
    return Number(ma[2]) - Number(mb[2])
  })
}

const handleReset = () => {
  draftColors.value = []
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save', {
    brand: props.brand,
    colorKind: props.colorKind,
    colors: normalizeRepurchaseColors(draftColors.value),
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
  width: min(820px, 82vw);
  height: min(86vh, 860px);
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
}

.dialog-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 14px 44px 10px;
}

.dialog-header h4 {
  margin: 0;
  color: #222;
  font-size: 17px;
  font-weight: 700;
}

.dialog-close {
  position: absolute;
  top: 10px;
  right: 12px;
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
  overflow: hidden;
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
}

.brand-line {
  flex-shrink: 0;
  margin: 0 0 8px;
  color: #888;
  font-size: 12px;
}

.dialog-body :deep(.color-library) {
  flex: 1;
  min-height: 0;
}

.dialog-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid #eee;
}

.footer-actions {
  display: flex;
  gap: 8px;
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

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary {
  border: none;
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-accent-deep);
}
</style>
