import axios from 'axios';
import { getToken } from './auth.service';
import type {
  LearningRecord,
  CreateLearningRecordData,
  PaginatedLearningRecords,
} from '../types/learning-record.types';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 创建带认证的 axios 实例
const api = axios.create({
  baseURL: `${API_URL}`,
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * API 响应格式
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 创建学习记录
 * @param data 学习记录数据
 * @returns 创建的学习记录
 */
export async function createLearningRecord(
  data: CreateLearningRecordData,
): Promise<LearningRecord> {
  const response = await api.post<ApiResponse<LearningRecord>>(
    '/learning-records',
    data,
  );
  return response.data.data;
}

/**
 * 获取学习记录列表
 * @param knowledgePointId 可选，知识点ID过滤
 * @param page 页码，默认为1
 * @param limit 每页数量，默认为20
 * @returns 分页的学习记录列表
 */
export async function getLearningRecords(
  knowledgePointId?: string,
  page = 1,
  limit = 20,
): Promise<PaginatedLearningRecords> {
  const params: Record<string, string | number> = { page, limit };
  if (knowledgePointId) {
    params.knowledgePointId = knowledgePointId;
  }

  const response = await api.get<ApiResponse<PaginatedLearningRecords>>(
    '/learning-records',
    { params },
  );
  return response.data.data;
}

/**
 * 获取特定知识点的学习记录
 * @param knowledgePointId 知识点ID
 * @returns 该知识点的学习记录列表
 */
export async function getLearningRecordsByKnowledgePoint(
  knowledgePointId: string,
): Promise<LearningRecord[]> {
  const response = await api.get<ApiResponse<LearningRecord[]>>(
    `/learning-records/knowledge-point/${knowledgePointId}`,
  );
  return response.data.data;
}
