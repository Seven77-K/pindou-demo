<template>
  <div class="page-card">
    <div class="page-header">
      <div class="header-left">
        <h3>拼豆工具</h3>
        <span class="header-badge">共 {{ totalCount }} 件工具</span>
      </div>
    </div>

    <div class="module-grid">
      <button
        v-for="item in modules"
        :key="item.key"
        type="button"
        class="module-card"
        @click="openModule(item)"
      >
        <span class="module-icon">{{ item.icon }}</span>
        <span class="module-name">{{ item.name }}</span>
        <span class="module-count">{{ item.count }}</span>
        <span class="module-unit">件</span>
      </button>
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <h4>拼豆板统计</h4>
        <ToolBoardChart />
      </div>
      <div class="chart-card">
        <h4>拼豆笔统计</h4>
        <ToolPenChart />
      </div>
      <div class="chart-card">
        <h4>拼豆铲统计</h4>
        <ToolScoopChart />
      </div>
      <div class="chart-card">
        <h4>其他统计</h4>
        <ToolOtherChart />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ToolBoardChart from '@/components/charts/ToolBoardChart.vue'
import ToolOtherChart from '@/components/charts/ToolOtherChart.vue'
import ToolPenChart from '@/components/charts/ToolPenChart.vue'
import ToolScoopChart from '@/components/charts/ToolScoopChart.vue'
import {
  BOARD_ALL_SLUG,
  boardInventory,
  getBoardStock,
  getTotalToolStock,
  getToolStock,
  TOOL_CATEGORIES,
  toolInventory,
} from './constants'

const router = useRouter()

const boardStockTotal = computed(() => {
  void boardInventory
  return getBoardStock(BOARD_ALL_SLUG)
})

const penStock = computed(() => {
  void toolInventory
  return getToolStock('pen')
})

const scoopStock = computed(() => {
  void toolInventory
  return getToolStock('scoop')
})

const otherStock = computed(() => {
  void toolInventory
  return getToolStock('other')
})

const totalCount = computed(() => {
  void boardInventory
  void toolInventory
  return getTotalToolStock()
})

const modules = computed(() => [
  {
    key: 'board',
    name: '拼豆板',
    icon: '⊞',
    count: boardStockTotal.value,
    route: { name: 'tools-board', params: { size: BOARD_ALL_SLUG } },
  },
  {
    key: 'pen',
    name: TOOL_CATEGORIES.pen.name,
    icon: TOOL_CATEGORIES.pen.icon,
    count: penStock.value,
    route: { name: 'tools-pen' },
  },
  {
    key: 'scoop',
    name: TOOL_CATEGORIES.scoop.name,
    icon: TOOL_CATEGORIES.scoop.icon,
    count: scoopStock.value,
    route: { name: 'tools-scoop' },
  },
  {
    key: 'other',
    name: TOOL_CATEGORIES.other.name,
    icon: TOOL_CATEGORIES.other.icon,
    count: otherStock.value,
    route: { name: 'tools-other' },
  },
])

const openModule = (item) => {
  router.push(item.route)
}
</script>

<style scoped>
.page-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-width: 100%;
  min-height: 0;
  padding: 20px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.page-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 17px;
}

.header-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-pale);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.module-grid {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.module-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 108px;
  padding: 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff 0%, var(--color-pale) 100%);
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.module-card:hover {
  border-color: var(--el-color-primary-light-7);
  box-shadow: 0 4px 14px rgba(168, 56, 88, 0.1);
  transform: translateY(-1px);
}

.module-icon {
  color: var(--color-accent);
  font-size: 26px;
  line-height: 1;
}

.module-name {
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
}

.module-count {
  color: var(--color-accent);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.module-unit {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.chart-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
}

.chart-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #fff;
}

.chart-card h4 {
  flex-shrink: 0;
  margin: 0 0 8px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.chart-box {
  flex: 1;
  min-height: 180px;
}

@media (max-width: 960px) {
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, minmax(220px, 1fr));
    overflow: auto;
  }
}
</style>
