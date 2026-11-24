<template>
  <div class="color-library">
    <div v-if="showTitle" class="library-title">221全实色-自选色号（{{ colors.length }}）</div>
    <div class="library-grid">
      <button
        v-for="color in colors"
        :key="color.code"
        type="button"
        class="color-tile"
        :class="{ selected: selectedSet.has(color.code) }"
        :style="{ background: color.hex, color: getBeadColorLabelColor(color.hex) }"
        :title="color.code"
        @click="$emit('toggle', color.code)"
      >
        <span class="code">{{ color.code }}</span>
        <span v-if="selectedSet.has(color.code)" class="check">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  BEAD_COLORS_221,
  getBeadColorLabelColor,
  normalizeRepurchaseColors,
} from '@/constants/beadColors221'

const props = defineProps({
  selectedColors: { type: Array, default: () => [] },
  showTitle: { type: Boolean, default: true },
})

defineEmits(['toggle'])

const selectedSet = computed(() => new Set(normalizeRepurchaseColors(props.selectedColors)))
const colors = computed(() => BEAD_COLORS_221)
</script>

<style scoped>
.color-library {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.library-title {
  flex-shrink: 0;
  margin-bottom: 8px;
  color: #333;
  font-size: 12px;
  font-weight: 600;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(16, minmax(0, 1fr));
  gap: 4px;
  flex: 1;
  min-height: 0;
  align-content: start;
}

.color-tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.color-tile:hover {
  filter: brightness(0.97);
}

.color-tile.selected {
  box-shadow:
    0 0 0 1px #fff,
    0 0 0 2px var(--color-accent, #e07890);
  z-index: 1;
}

.code {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.check {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

@media (max-width: 720px) {
  .library-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}
</style>
