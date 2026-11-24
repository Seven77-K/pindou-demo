<template>
  <Teleport to="body">
    <div v-if="visible && !zoomed" class="preview-mask" @click="close">
      <div class="preview-box" @click.stop>
        <button type="button" class="preview-close" @click="close">×</button>
        <img
          class="preview-image"
          :src="image"
          :alt="name"
          title="点击查看完整大图"
          @click="zoomed = true"
        />
        <p class="preview-title">{{ name }}</p>
        <p class="preview-hint">点击图片全屏查看完整图纸</p>
        <button
          type="button"
          class="btn-save"
          :disabled="!image || saving"
          @click="handleSave"
        >
          {{ saving ? '保存中…' : '保存图片' }}
        </button>
      </div>
    </div>

    <div v-if="visible && zoomed" class="zoom-mask" @click="zoomed = false">
      <button type="button" class="zoom-close" @click.stop="zoomed = false">×</button>
      <button
        type="button"
        class="zoom-save"
        :disabled="!image || saving"
        @click.stop="handleSave"
      >
        {{ saving ? '保存中…' : '保存图片' }}
      </button>
      <img class="zoom-image" :src="image" :alt="name" @click.stop />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'
import { downloadPatternImage } from '@/utils/patternBatchDownload'

const props = defineProps({
  visible: { type: Boolean, default: false },
  name: { type: String, default: '' },
  image: { type: String, default: '' },
})

const emit = defineEmits(['update:visible'])

const { showSuccess, showError } = useMessage()

const zoomed = ref(false)
const saving = ref(false)

const close = () => {
  zoomed.value = false
  emit('update:visible', false)
}

const handleSave = async () => {
  if (!props.image || saving.value) return
  saving.value = true
  try {
    await downloadPatternImage(props.name, props.image)
    showSuccess('图片已保存')
  } catch (error) {
    showError(error.message || '图片保存失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) zoomed.value = false
  }
)
</script>

<style scoped>
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.65);
}

.preview-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 95vw;
  max-height: 95vh;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.preview-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
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

.preview-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.preview-image {
  display: block;
  max-width: 85vw;
  max-height: 75vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  cursor: zoom-in;
}

.preview-title {
  margin: 12px 0 0;
  color: var(--color-text-primary);
  font-size: 14px;
  text-align: center;
}

.preview-hint {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-align: center;
}

.btn-save {
  margin-top: 12px;
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-image: var(--gradient-main);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(250, 208, 196, 0.4);
}

.btn-save:hover:not(:disabled) {
  opacity: 0.92;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-mask {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.92);
  cursor: zoom-out;
}

.zoom-close {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.zoom-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

.zoom-save {
  position: fixed;
  top: 16px;
  right: 68px;
  z-index: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.zoom-save:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
}

.zoom-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  cursor: default;
  user-select: none;
}
</style>
