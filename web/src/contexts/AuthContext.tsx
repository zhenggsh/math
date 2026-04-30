import React, { createContext, useState, useEffect, useCallback } from 'react'
import type { AuthContextType, User, AuthResponse, Role } from '../types/auth.types'
import {
  login as loginApi,
  register as registerApi,
  getProfile,
  getToken,
  setToken,
  removeToken,
} from '../services/auth.service'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 应用启动时验证 token 并恢复登录状态
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken()
      if (token) {
        try {
          const profile = await getProfile(token)
          setUser(profile)
        } catch {
          removeToken()
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    void initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response: AuthResponse = await loginApi({ email, password })
    setToken(response.access_token)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role?: Role }) => {
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
