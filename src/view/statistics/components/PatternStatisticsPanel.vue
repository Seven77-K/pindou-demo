<template>
  <div class="statistics-panel">
    <el-tabs v-model="activePatternTab" class="sub-tabs">
      <el-tab-pane label="会员图纸" name="member" />
      <el-tab-pane label="普通图纸" name="normal" />
    </el-tabs>

    <MemberPatternStatistics v-show="activePatternTab === 'member'" ref="memberPanelRef" :patterns="memberPatterns" />

    <NormalPatternStatistics v-show="activePatternTab === 'normal'" ref="normalPanelRef" :patterns="normalPatterns"
      :active="activePatternTab === 'normal'" />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import MemberPatternStatistics from './MemberPatternStatistics.vue'
import NormalPatternStatistics from './NormalPatternStatistics.vue'

defineProps({
  memberPatterns: {
    type: Array,
    default: () => [],
  },
  normalPatterns: {
    type: Array,
    default: () => [],
  },
})

const activePatternTab = ref('member')
const memberPanelRef = ref(null)
const normalPanelRef = ref(null)

const renderActivePanel = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (activePatternTab.value === 'member') {
        memberPanelRef.value?.render()
      } else {
        normalPanelRef.value?.render()
      }
    })
  })
}

const resize = () => {
  if (activePatternTab.value === 'member') {
    memberPanelRef.value?.resize()
  } else {
    normalPanelRef.value?.resize()
  }
}

const dispose = () => {
  memberPanelRef.value?.dispose()
  normalPanelRef.value?.dispose()
}

watch(activePatternTab, renderActivePanel)

defineExpose({
  activePatternTab,
  render: renderActivePanel,
  resize,
  dispose,
})

onMounted(renderActivePanel)
</script>

<style scoped>
.statistics-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.sub-tabs {
  flex-shrink: 0;
}
</style>

<style scoped src="../statistics-charts.css"></style>
