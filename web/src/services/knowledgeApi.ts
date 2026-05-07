import axios from 'axios';
import { getToken } from './auth.service';
import type { KnowledgePoint, KnowledgePointDetail, LearningRecord } from '../types/knowledge.types';

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
 * 知识点相关 API
 */
export const knowledgeApi = {
  /**
   * 获取知识树
   * @param textbookId 教材ID
   */
  async getKnowledgeTree(textbookId: string): Promise<KnowledgePoint[]> {
    const response = await api.get(`/textbooks/${textbookId}/knowledge-points`);
    return response.data.data;
  },

  /**
   * 获取知识点详情
   * @param id 知识点ID
   */
  async getKnowledgePointDetail(id: string): Promise<KnowledgePointDetail> {
    const response = await api.get(`/textbooks/knowledge-points/${id}`);
    return response.data.data;
  },

  /**
   * 搜索知识点
   * @param keyword 关键词
   */
  async searchKnowledgePoints(keyword: string): Promise<KnowledgePoint[]> {
    const response = await api.get(`/knowledge-points/search`, {
      params: { keyword },
    });
    return response.data.data;
  },

  /**
   * 保存知识点内容到教材 MD 文件
   * @param textbookId 教材ID
   * @param knowledgePointId 知识点ID
   * @param content 新内容
   */
  async saveKnowledgePointContent(
    textbookId: string,
    knowledgePointId: string,
    content: string,
  ): Promise<void> {
    await api.put(`/textbooks/${textbookId}/content`, {
      knowledgePointId,
      content,
    });
  },
};

/**
 * 学习记录相关 API
 */
export const learningRecordApi = {
  /**
   * 获取学习记录列表
   * @param knowledgePointId 知识点ID（可选）
   */
  async getLearningRecords(knowledgePointId?: string): Promise<LearningRecord[]> {
    const response = await api.get('/learning-records', {
      params: knowledgePointId ? { knowledgePointId } : undefined,
    });
    return response.data.data;
  },

  /**
   * 创建学习记录
   * @param data 学习记录数据
   */
  async createLearningRecord(data: {
    knowledgePointId: string;
    startTime: string;
    durationMinutes: number;
    masteryLevel: string;
    notes?: string;
  }): Promise<LearningRecord> {
    const response = await api.post('/learning-records', data);
    return response.data.data;
  },
};

export default knowledgeApi;
