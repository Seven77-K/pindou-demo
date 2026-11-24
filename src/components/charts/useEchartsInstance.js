import * as echarts from 'echarts'
import { ref } from 'vue'

export function useEchartsInstance() {
  const chartRef = ref(null)
  let chartInstance = null
  let pendingOption = null
  let pendingEvents = null
  let retryTimer = null
  let disposed = false

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const canRender = () => {
    if (disposed || !chartRef.value) return false
    const { clientWidth, clientHeight } = chartRef.value
    return clientWidth > 0 && clientHeight > 0
  }

  const bindEvents = (events) => {
    if (!chartInstance || chartInstance.isDisposed?.()) return
    chartInstance.off('click')
    if (events && typeof events.click === 'function') {
      chartInstance.on('click', events.click)
    }
  }

  const applyOption = (option, events = null) => {
    if (disposed || !chartRef.value) return

    if (chartInstance && !chartInstance.isDisposed?.()) {
      const dom = chartInstance.getDom?.()
      if (dom && dom !== chartRef.value) {
        chartInstance.dispose()
        chartInstance = null
      }
    }

    if (!chartInstance || chartInstance.isDisposed?.()) {
      chartInstance = echarts.init(chartRef.value)
    }

    chartInstance.setOption(option, true)
    chartInstance.resize()
    pendingOption = null
    pendingEvents = events
    bindEvents(events)
    clearRetryTimer()
  }

  const render = (option, events = null, retry = 0) => {
    if (disposed) return
    pendingOption = option
    pendingEvents = events

    if (!canRender()) {
      if (retry < 30) {
        requestAnimationFrame(() => {
          if (!disposed) render(option, events, retry + 1)
        })
        return
      }
      if (!retryTimer) {
        retryTimer = window.setTimeout(() => {
          if (!disposed) render(option, events, 31)
        }, 400)
      }
      return
    }

    applyOption(option, events)
  }

  const resize = () => {
    if (disposed) return
    if (chartInstance && !chartInstance.isDisposed?.()) {
      chartInstance.resize()
      return
    }
    if (pendingOption) {
      render(pendingOption, pendingEvents)
    }
  }

  const dispose = () => {
    disposed = true
    clearRetryTimer()
    pendingOption = null
    pendingEvents = null
    chartInstance?.dispose()
    chartInstance = null
  }

  return { chartRef, render, resize, dispose }
}
