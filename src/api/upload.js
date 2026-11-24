import axios from 'axios'
import { getAuthToken } from '@/composables/useAuth'
import { compressImageForUpload } from '@/utils/imageFile'

export async function uploadImage(file) {
  const prepared = await compressImageForUpload(file)
  const formData = new FormData()
  formData.append('file', prepared)
  const headers = { 'Content-Type': 'multipart/form-data' }
  const authToken = getAuthToken()
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  return axios
    .post('/api/upload', formData, {
      headers,
      timeout: 30000,
    })
    .then((response) => {
      const payload = response.data
      if (payload && typeof payload.code === 'number' && payload.code !== 0) {
        return Promise.reject(new Error(payload.message || '图片上传失败'))
      }
      return payload?.data?.url
    })
}
