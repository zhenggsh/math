import axios from 'axios'
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth.types'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
})

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await authApi.post('/login', data)
  return response.data
}

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await authApi.post('/register', data)
  return response.data
}

export const getProfile = async (token: string): Promise<User> => {
  const response = await authApi.get('/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

// Token 管理
export const TOKEN_KEY = 'access_token'

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}
