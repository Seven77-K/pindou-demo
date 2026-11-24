<template>
  <div class="page">
    <el-tabs v-model="activeMainTab" class="main-tabs">
      <el-tab-pane label="拼豆图纸" name="pattern" />
      <el-tab-pane label="拼豆花费" name="cost" />
    </el-tabs>

    <PatternStatisticsPanel v-if="activeMainTab === 'pattern'" ref="patternPanelRef" :member-patterns="memberPatterns"
      :normal-patterns="normalPatterns" />

    <CostStatisticsPanel v-else-if="activeMainTab === 'cost'" ref="costPanelRef" />

    <StatisticsPlaceholder v-else title="未知统计" />
  </div>
</template>

<script>
export default {
  name: 'StatisticsPage',
}
</script>

<script setup>
import { nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { loadPatterns, usePatternData } from '@/composables/usePatternData'
import CostStatisticsPanel from './components/CostStatisticsPanel.vue'
import PatternStatisticsPanel from './components/PatternStatisticsPanel.vue'
import StatisticsPlaceholder from './components/StatisticsPlaceholder.vue'

const route = useRoute()
const { user } = useAuth()
const { memberPatterns, normalPatterns } = usePatternData()

const activeMainTab = ref('pattern')
const patternPanelRef = ref(null)
const costPanelRef = ref(null)

const applyRouteQuery = () => {
  const { tab, patternTab } = route.query
  if (tab === 'pattern' || tab === 'cost') {
    activeMainTab.value = tab
  }
  if (patternTab === 'member' || patternTab === 'normal') {
    nextTick(() => {
      if (patternPanelRef.value) {
        patternPanelRef.value.activePatternTab = patternTab
      }
    })
  }
}

const renderActivePanel = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (activeMainTab.value === 'pattern') {
        patternPanelRef.value?.render()
      } else if (activeMainTab.value === 'cost') {
        costPanelRef.value?.render()
      }
    })
  })
}

const resizeActivePanel = () => {
  if (activeMainTab.value === 'pattern') {
    patternPanelRef.value?.resize()
  } else if (activeMainTab.value === 'cost') {
    costPanelRef.value?.resize()
  }
}

const refreshDataInBackground = () => {
  if (!user.value?.id) return
  loadPatterns(true).then(renderActivePanel)
}

const enterPage = () => {
  applyRouteQuery()
  renderActivePanel()
  refreshDataInBackground()
}

onMounted(() => {
  enterPage()
  window.addEventListener('resize', resizeActivePanel)
})

onActivated(() => {
  enterPage()
  requestAnimationFrame(resizeActivePanel)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeActivePanel)
})

watch(activeMainTab, renderActivePanel)

watch(memberPatterns, () => {
  if (activeMainTab.value === 'pattern') renderActivePanel()
}, { deep: true })

watch(normalPatterns, () => {
  if (activeMainTab.value === 'pattern') renderActivePanel()
}, { deep: true })

watch(
  () => route.query,
  () => {
    if (route.name !== 'statistics') return
    applyRouteQuery()
    renderActivePanel()
  },
)

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) refreshDataInBackground()
  },
)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.main-tabs {
  flex-shrink: 0;
}
</style>
