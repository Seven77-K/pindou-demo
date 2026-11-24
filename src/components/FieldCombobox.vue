<template>
  <div class="field-combobox" :class="{ 'field-combobox-clearable': modelValue }">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="hideDelayed"
    />
    <button
      v-if="modelValue"
      type="button"
      class="field-combobox-clear"
      tabindex="-1"
      :aria-label="clearLabel"
      @mousedown.prevent="clearValue"
    >
      ×
    </button>
    <button
      type="button"
      class="field-combobox-toggle"
      tabindex="-1"
      :aria-label="toggleLabel"
      @mousedown.prevent="toggleList"
    >
      ▼
    </button>
    <ul v-if="open && filteredOptions.length" class="field-combobox-list">
      <li
        v-for="option in filteredOptions"
        :key="option"
        @mousedown.prevent="selectOption(option)"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择或输入' },
  clearLabel: { type: String, default: '清除' },
  toggleLabel: { type: String, default: '展开列表' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
let hideTimer = null

const filteredOptions = computed(() => {
  const keyword = (props.modelValue || '').trim().toLowerCase()
  const list = props.options || []
  if (!keyword) return list
  return list.filter((item) => String(item).toLowerCase().includes(keyword))
})

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
  open.value = true
}

const onFocus = () => {
  clearTimeout(hideTimer)
  open.value = true
}

const hideDelayed = () => {
  hideTimer = setTimeout(() => {
    open.value = false
  }, 150)
}

const toggleList = () => {
  clearTimeout(hideTimer)
  open.value = !open.value
}

const selectOption = (value) => {
  emit('update:modelValue', value)
  open.value = false
}

const clearValue = () => {
  emit('update:modelValue', '')
}
</script>

<style scoped>
.field-combobox {
  position: relative;
  width: 100%;
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
  z-index: 30;
  max-height: 240px;
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
</style>
