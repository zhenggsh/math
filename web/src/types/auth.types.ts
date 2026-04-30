export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: Role
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

// 为了兼容 Vite 的类型导入，额外导出类型别名
export type { User, AuthResponse, LoginRequest, RegisterRequest, AuthContextType }
