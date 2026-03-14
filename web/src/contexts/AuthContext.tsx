import React, { createContext, useState, useEffect, useCallback } from 'react'
import { AuthContextType, User, AuthResponse } from '../types/auth.types'
import {
  login as loginApi,
  register as registerApi,
  getToken,
  setToken,
  removeToken,
} from '../services/auth.service'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 应用启动时恢复登录状态
  useEffect(() => {
    const initAuth = () => {
      const token = getToken()
      if (token) {
        // 这里可以调用 API 验证 Token 并获取用户信息
        // 简化处理：从 JWT payload 解码（实际项目中建议调用 /auth/profile）
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || '',
            role: payload.role,
          })
        } catch {
          removeToken()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response: AuthResponse = await loginApi({ email, password })
    setToken(response.access_token)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role?: any }) => {
      const response: AuthResponse = await registerApi(data)
      setToken(response.access_token)
      setUser(response.user)
    },
    []
  )

  const logout = useCallback(() => {
    removeToken()
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
