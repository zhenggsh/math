/**
 * 知识点重要性级别
 */
export type ImportanceLevel = 'A' | 'B' | 'C';

/**
 * 掌握程度
 */
export type MasteryLevel = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * 学习状态
 */
export type LearningStatus = 'not_started' | 'learning' | 'mastered' | 'review_needed';

/**
 * 知识点（后端返回的原始数据）
 */
export interface KnowledgePoint {
  /** 唯一标识 */
  id: string;
  /** 知识点编号 */
  code: string;
  /** 一级知识点 */
  level1: string;
  /** 二级知识点 */
  level2?: string;
  /** 三级知识点 */
  level3?: string;
  /** 定义 */
  definition?: string;
  /** 特性/运算方式 */
  characteristics?: string;
  /** 重要性级别 */
  importanceLevel: ImportanceLevel;
  /** 内容引用 */
  contentRef?: string;
  /** 教材ID */
  textbookId: string;
}

/**
 * 知识树节点（前端使用的树形结构）
 */
export interface KnowledgeTreeNode {
  /** 节点唯一标识（使用 code） */
  key: string;
  /** 节点标题 */
  title: string;
  /** 知识点编号 */
  code: string;
  /** 重要性级别 */
  importanceLevel: ImportanceLevel;
  /** 学习状态 */
  learningStatus?: LearningStatus;
  /** 子节点 */
  children?: KnowledgeTreeNode[];
  /** 是否叶子节点 */
  isLeaf?: boolean;
  /** 原始数据 */
  data: KnowledgePoint;
}

/**
 * 学习记录
 */
export interface LearningRecord {
  /** 唯一标识 */
  id: string;
  /** 开始时间 */
  startTime: string;
  /** 学习时长（分钟） */
  durationMinutes: number;
  /** 掌握程度 */
  masteryLevel: MasteryLevel;
  /** 笔记 */
  notes?: string;
  /** 用户ID */
  userId: string;
  /** 知识点ID */
  knowledgePointId: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 知识点详情（包含内容和笔记）
 */
export interface KnowledgePointDetail extends KnowledgePoint {
  /** Markdown 内容 */
  content?: string;
  /** 学习记录 */
  learningRecords?: LearningRecord[];
  /** 最近学习记录 */
  latestRecord?: LearningRecord;
}

/**
 * 知识树查询参数
 */
export interface KnowledgeTreeQuery {
  /** 教材ID */
  textbookId: string;
  /** 是否包含学习状态 */
  includeStatus?: boolean;
}

/**
 * 知识点筛选条件
 */
export interface KnowledgePointFilter {
  /** 教材ID */
  textbookId?: string;
  /** 重要性级别 */
  importanceLevel?: ImportanceLevel;
  /** 学习状态 */
  learningStatus?: LearningStatus;
  /** 搜索关键词 */
  keyword?: string;
}
