import axios from 'axios';
import { getToken } from './auth.service';
import type { KnowledgePoint } from '../types/knowledge.types';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/smart-learning`,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface WeakPointItem {
  knowledgePoint: KnowledgePoint;
  learningRecord: {
    id: string;
    masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E';
    durationMinutes: number;
    startTime: string;
    notes: string | null;
  };
  priority: number;
}

export interface ByImportanceItem extends KnowledgePoint {
  isMastered: boolean;
}

export interface LearningStats {
  weakPointCount: number;
  importanceStats: { A: number; B: number; C: number };
}

export const smartLearningApi = {
  /**
   * 获取薄弱知识点
   */
  async getWeakPoints(params?: { textbookId?: string; limit?: number }) {
    const response = await api.get('/weak-points', { params });
    return response.data.data as { total: number; items: WeakPointItem[] };
  },

  /**
   * 按重要性获取知识点
   */
  async getByImportance(params?: {
    level?: 'A' | 'B' | 'C';
    excludeMastered?: boolean;
    limit?: number;
  }) {
    const response = await api.get('/by-importance', { params });
    return response.data.data as { level: 'A' | 'B' | 'C'; total: number; items: ByImportanceItem[] };
  },

  /**
   * 获取随机知识点
   */
  async getRandomPoints(params?: { textbookId?: string; count?: number }) {
    const response = await api.get('/random', { params });
    return response.data.data as { items: KnowledgePoint[] };
  },

  /**
   * 获取学习统计
   */
  async getLearningStats() {
    const response = await api.get('/stats');
    return response.data.data as LearningStats;
  },
};

export default smartLearningApi;
