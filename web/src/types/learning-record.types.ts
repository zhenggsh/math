/**
 * 掌握程度枚举
 */
export type MasteryLevel = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * 重要性级别枚举
 */
export type ImportanceLevel = 'A' | 'B' | 'C';

/**
 * 知识点信息
 */
export interface KnowledgePointInfo {
  id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  importanceLevel: ImportanceLevel;
}

/**
 * 学习记录
 */
export interface LearningRecord {
  id: string;
  userId: string;
  knowledgePointId: string;
  startTime: string;
  durationMinutes: number;
  masteryLevel: MasteryLevel;
  notes: string | null;
  createdAt: string;
  knowledgePoint: KnowledgePointInfo;
}

/**
 * 创建学习记录请求数据
 */
export interface CreateLearningRecordData {
  knowledgePointId: string;
  masteryLevel: MasteryLevel;
  durationMinutes: number;
  startTime?: string;
  notes?: string;
}

/**
 * 分页学习记录响应
 */
export interface PaginatedLearningRecords {
  items: LearningRecord[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 掌握程度配置
 */
export interface MasteryLevelConfig {
  level: MasteryLevel;
  label: string;
  color: string;
  description: string;
}

/**
 * 掌握程度配置映射
 */
export const MASTERY_LEVEL_CONFIG: Record<MasteryLevel, MasteryLevelConfig> = {
  A: {
    level: 'A',
    label: '优秀',
    color: '#52C41A',
    description: '完全掌握',
  },
  B: {
    level: 'B',
    label: '良好',
    color: '#73D13D',
    description: '基本掌握',
  },
  C: {
    level: 'C',
    label: '一般',
    color: '#FAAD14',
    description: '部分掌握',
  },
  D: {
    level: 'D',
    label: '较差',
    color: '#FA8C16',
    description: '需要复习',
  },
  E: {
    level: 'E',
    label: '很差',
    color: '#F5222D',
    description: '需要重新学习',
  },
};
