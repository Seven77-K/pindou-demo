import axios from 'axios'
import { getAuthToken, useAuth } from '@/composables/useAuth'
import { isLocalDefaultToken } from '@/config/defaultAuth'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const authToken = getAuthToken()
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (payload && typeof payload.code === 'number' && payload.code !== 0) {
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return payload?.data ?? payload
  },
  (error) => {
    if (error.response?.status === 401) {
      if (isLocalDefaultToken(getAuthToken())) {
        return Promise.reject(new Error('当前为离线登录，请确认后端已启动后退出并重新登录'))
      }
      const { clearSession } = useAuth()
      clearSession()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = `${process.env.BASE_URL || '/'}login`
      }
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(new Error('连接后端超时，请先运行 npm run backend 启动本地后端，并重启前端 npm run serve'))
    }
    if (!error.response) {
      return Promise.reject(new Error('无法连接后端，请先运行 npm run backend'))
    }
    if (error.response.status === 404) {
      return Promise.reject(new Error('接口不存在，请重启后端：npm run backend'))
    }
    const message = error.response.data?.message
    return Promise.reject(new Error(message || error.message || '请求失败'))
  }
)

export default request
