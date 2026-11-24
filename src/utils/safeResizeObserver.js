/** 避免 ResizeObserver 回调同步改布局触发 loop 报错 */
export function createSafeResizeObserver(callback) {
  let rafId = 0

  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = 0
      callback()
    })
  })

  const disconnect = observer.disconnect.bind(observer)
  observer.disconnect = () => {
    cancelAnimationFrame(rafId)
    disconnect()
  }

  return observer
}
