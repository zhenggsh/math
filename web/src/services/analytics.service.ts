import axios from 'axios'
import { getToken } from './auth.service'
import type {
  StudentOverview,
  MasteryDistribution,
  LearningTrend,
  WeakPoints,
  ClassOverview,
  KnowledgeHeat,
  StudentComparison,
  KnowledgePointProgress,
  LearnedKnowledgePoints,
} from '../types/analytics.types'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建带认证的 axios 实例
const api = axios.create({
  baseURL: `${API_URL}`,
})

// 请求拦截器 - 添加 token
api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * API 响应格式
 */
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * 获取学生学习概览
 */
export async function getStudentOverview(): Promise<StudentOverview> {
  const response = await api.get<ApiResponse<StudentOverview>>('/analytics/student/overview')
  return response.data.data
}

/**
 * 获取掌握程度分布
 */
export async function getMasteryDistribution(): Promise<MasteryDistribution> {
  const response = await api.get<ApiResponse<MasteryDistribution>>(
    '/analytics/student/mastery-distribution'
  )
  return response.data.data
}

/**
 * 获取学习趋势
 * @param days 查询天数（默认30）
 */
export async function getLearningTrend(days = 30): Promise<LearningTrend> {
  const response = await api.get<ApiResponse<LearningTrend>>('/analytics/student/learning-trend', {
    params: { days },
  })
  return response.data.data
}

/**
 * 获取薄弱知识点
 * @param limit 返回数量限制（默认10）
 */
export async function getWeakPoints(limit = 10): Promise<WeakPoints> {
  const response = await api.get<ApiResponse<WeakPoints>>('/analytics/student/weak-points', {
    params: { limit },
  })
  return response.data.data
}

/**
 * 获取已学知识点列表（所有掌握度级别）
 */
export async function getLearnedKnowledgePoints(): Promise<LearnedKnowledgePoints> {
  const response = await api.get<ApiResponse<LearnedKnowledgePoints>>(
    '/analytics/student/learned-knowledge-points',
  )
  return response.data.data
}

/**
 * 获取知识点进度
 * @param knowledgePointId 知识点ID
 * @param startDate 开始日期（可选）
 * @param endDate 结束日期（可选）
 */
export async function getKnowledgePointProgress(
  knowledgePointId: string,
  startDate?: string,
  endDate?: string
): Promise<KnowledgePointProgress> {
  const params: Record<string, string> = { knowledgePointId }
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate

  const response = await api.get<ApiResponse<KnowledgePointProgress>>(
    '/analytics/student/knowledge-point-progress',
    { params }
  )
  return response.data.data
}

/**
 * 获取班级概览（教师）
 * @param classId 班级ID（可选）
 */
export async function getClassOverview(classId?: string): Promise<ClassOverview> {
  const response = await api.get<ApiResponse<ClassOverview>>('/analytics/teacher/class-overview', {
    params: classId ? { classId } : undefined,
  })
  return response.data.data
}

/**
 * 获取知识点热度（教师）
 * @param limit 返回数量限制（默认20）
 */
export async function getKnowledgeHeat(limit = 20): Promise<KnowledgeHeat> {
  const response = await api.get<ApiResponse<KnowledgeHeat>>('/analytics/teacher/knowledge-heat', {
    params: { limit },
  })
  return response.data.data
}

/**
 * 获取学生对比（教师）
 * @param studentIds 学生ID列表
 */
export async function getStudentComparison(studentIds: string[]): Promise<StudentComparison> {
  const response = await api.get<ApiResponse<StudentComparison>>(
    '/analytics/teacher/student-comparison',
    {
      params: { studentIds: studentIds.join(',') },
    }
  )
  return response.data.data
}

/**
 * 获取学生列表（教师）
 */
export async function getStudents(): Promise<Array<{ id: string; name: string }>> {
  const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>(
    '/analytics/teacher/students'
  )
  return response.data.data
}

/**
 * 导出数据（教师）
 * @param params 导出参数
 */
export async function exportData(params: {
  classId?: string
  startDate?: string
  endDate?: string
  format: 'xlsx' | 'csv'
}): Promise<Blob> {
  const response = await api.post('/analytics/teacher/export', params, {
    responseType: 'blob',
  })
  return response.data
}
