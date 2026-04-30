/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import axios from 'axios'
import { getToken } from './auth.service'
import type { Textbook, TextbookDetail, SyncResult, UploadResult } from '../types/textbook.types'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建带认证的 axios 实例
const textbookApi = axios.create({
  baseURL: `${API_URL}/textbooks`,
})

// 请求拦截器 - 添加 token
textbookApi.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 获取所有教材列表
 */
export const getTextbooks = async (): Promise<Textbook[]> => {
  const response = await textbookApi.get('/')
  return response.data.data
}

/**
 * 获取教材详情
 */
export const getTextbook = async (id: string): Promise<TextbookDetail> => {
  const response = await textbookApi.get(`/${id}`)
  return response.data.data
}

/**
 * 同步所有教材
 */
export const syncAllTextbooks = async (): Promise<SyncResult> => {
  const response = await textbookApi.post('/sync')
  return response.data.data
}

/**
 * 刷新指定教材
 */
export const refreshTextbook = async (id: string): Promise<void> => {
  await textbookApi.post(`/${id}/refresh`)
}

/**
 * 删除教材
 */
export const deleteTextbook = async (id: string): Promise<void> => {
  await textbookApi.delete(`/${id}`)
}

/**
 * 上传教材文件
 * @param frameworkFile 框架文件 (.xlsx 或 .csv)
 * @param contentFile 内容文件 (.md, 可选)
 * @param baseName 教材基础名称
 */
export const uploadTextbook = async (
  frameworkFile: File,
  contentFile: File | null,
  baseName: string
): Promise<UploadResult> => {
  const formData = new FormData()
  formData.append('framework', frameworkFile)
  if (contentFile) {
    formData.append('content', contentFile)
  }
  formData.append('baseName', baseName)

  const response = await textbookApi.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
