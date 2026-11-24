import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { createSafeResizeObserver } from '@/utils/safeResizeObserver'

export const LIST_TABLE_ROW_HEIGHT = 52
export const LIST_TABLE_HEAD_HEIGHT = 38

export function listTableStyle(pageSize) {
  return {
    '--list-table-row-h': `${LIST_TABLE_ROW_HEIGHT}px`,
    '--list-table-head-h': `${LIST_TABLE_HEAD_HEIGHT}px`,
    '--list-table-page-rows': pageSize,
  }
}

/** 根据 .table-wrap 可用高度计算每页行数，避免行被裁切 */
export function useListTablePagination() {
  const tableWrapRef = ref(null)
  const pageSize = ref(10)
  const currentPage = ref(1)
  let resizeObserver = null

  const recalcPageSize = () => {
    const el = tableWrapRef.value
    if (!el) return
    const height = el.clientHeight
    if (height < LIST_TABLE_HEAD_HEIGHT + LIST_TABLE_ROW_HEIGHT) return

    const rows = Math.floor((height - LIST_TABLE_HEAD_HEIGHT) / LIST_TABLE_ROW_HEIGHT)
    const next = Math.max(1, Math.min(50, rows))
    if (next === pageSize.value) return

    const prev = pageSize.value
    pageSize.value = next
    if (prev > 0) {
      const firstIndex = (currentPage.value - 1) * prev
      currentPage.value = Math.max(1, Math.floor(firstIndex / next) + 1)
    }
  }

  onMounted(() => {
    nextTick(() => {
      recalcPageSize()
      resizeObserver = createSafeResizeObserver(() => recalcPageSize())
      if (tableWrapRef.value) {
        resizeObserver.observe(tableWrapRef.value)
      }
    })
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  const tableStyle = computed(() => listTableStyle(pageSize.value))

  return {
    tableWrapRef,
    pageSize,
    currentPage,
    tableStyle,
    recalcPageSize,
  }
}
