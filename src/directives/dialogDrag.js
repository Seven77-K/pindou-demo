/**
 * 自定义弹框拖拽：加在 .dialog-box 上，拖头部 .dialog-header
 * 用法：<div class="dialog-box" v-dialog-drag>
 */
function getHeader(el) {
  return (
    el.querySelector('.dialog-header') ||
    el.querySelector('.el-dialog__header') ||
    null
  )
}

function clamp(value, min, max) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function bindDialogDrag(el) {
  if (el.__dialogDragCleanup) {
    el.__dialogDragCleanup()
    el.__dialogDragCleanup = null
  }

  const header = getHeader(el)
  if (!header) return

  header.style.cursor = 'move'
  header.style.userSelect = 'none'
  header.style.touchAction = 'none'

  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0
  let dragging = false

  const onMove = (event) => {
    if (!dragging) return
    const point = event.touches?.[0] || event
    const width = el.offsetWidth || el.getBoundingClientRect().width
    const height = el.offsetHeight || el.getBoundingClientRect().height
    const minLeft = 16 - width * 0.6
    const maxLeft = window.innerWidth - Math.min(80, width * 0.4)
    const minTop = 0
    const maxTop = Math.max(0, window.innerHeight - 48)
    const nextLeft = clamp(originLeft + (point.clientX - startX), minLeft, maxLeft)
    const nextTop = clamp(originTop + (point.clientY - startY), minTop, maxTop)
    el.style.left = `${nextLeft}px`
    el.style.top = `${nextTop}px`
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onUp)
  }

  const onDown = (event) => {
    if (event.type === 'mousedown' && event.button !== 0) return
    if (event.target.closest('button, a, input, textarea, select, .dialog-close, .el-dialog__headerbtn')) {
      return
    }

    const point = event.touches?.[0] || event
    const rect = el.getBoundingClientRect()

    // 始终按当前屏幕位置切到 fixed，避免 flex 居中导致跳动
    el.style.position = 'fixed'
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
    el.style.margin = '0'
    el.style.transform = 'none'
    el.style.zIndex = String(Math.max(2001, Number(el.style.zIndex) || 2001))

    startX = point.clientX
    startY = point.clientY
    originLeft = rect.left
    originTop = rect.top
    dragging = true

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)

    if (event.cancelable) event.preventDefault()
  }

  header.addEventListener('mousedown', onDown)
  header.addEventListener('touchstart', onDown, { passive: false })

  el.__dialogDragCleanup = () => {
    onUp()
    header.removeEventListener('mousedown', onDown)
    header.removeEventListener('touchstart', onDown)
    header.style.cursor = ''
    header.style.userSelect = ''
    header.style.touchAction = ''
  }
}

export const dialogDrag = {
  mounted(el) {
    bindDialogDrag(el)
  },
  updated(el) {
    // 避免反复解绑打断拖拽；仅在尚未绑定时补绑（如 header 延迟渲染）
    if (!el.__dialogDragCleanup && getHeader(el)) {
      bindDialogDrag(el)
    }
  },
  unmounted(el) {
    if (el.__dialogDragCleanup) {
      el.__dialogDragCleanup()
      el.__dialogDragCleanup = null
    }
  },
}

export default dialogDrag
