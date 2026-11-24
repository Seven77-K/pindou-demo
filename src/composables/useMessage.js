import { ElMessage } from 'element-plus'

export function useMessage() {
  return {
    showSuccess: (message) => {
      ElMessage.success(message)
    },
    showError: (message) => {
      ElMessage.error(message)
    },
  }
}
