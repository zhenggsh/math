import axios from 'axios'
import { getToken, removeToken } from '../services/auth.service'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动附加 Token
api.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

// 响应拦截器：处理 401 错误
api.interceptors.response.use(
  response => response,
  (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
      (error as { response: { status: number } }).response.status === 401
    ) {
      // Token 过期或无效，清除 Token 并跳转登录页
      removeToken()
      window.location.href = '/login'
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

export default api
