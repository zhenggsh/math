import type { MasteryLevel, ImportanceLevel } from '@prisma/client';

/**
 * 学生学习概览响应
 */
export interface StudentOverviewDto {
  totalLearningCount: number;
  totalDurationMinutes: number;
  uniqueKnowledgePoints: number;
}

/**
 * 掌握程度分布项
 */
export interface MasteryDistributionItem {
  level: MasteryLevel;
  count: number;
  percentage: number;
}

/**
 * 掌握程度分布响应
 */
export interface MasteryDistributionDto {
  distribution: MasteryDistributionItem[];
}

/**
 * 学习趋势项
 */
export interface LearningTrendItem {
  date: string;
  durationMinutes: number;
  count: number;
}

/**
 * 学习趋势响应
 */
export interface LearningTrendDto {
  trend: LearningTrendItem[];
}

/**
 * 薄弱知识点项
 */
export interface WeakPointItem {
  knowledgePointId: string;
  code: string;
  name: string;
  importanceLevel: ImportanceLevel;
  lastMasteryLevel: 'D' | 'E';
  lastLearningDate: string;
}

/**
 * 薄弱知识点响应
 */
export interface WeakPointsDto {
  weakPoints: WeakPointItem[];
}

/**
 * 班级概览响应
 */
export interface ClassOverviewDto {
  studentCount: number;
  activeStudentCount: number;
  avgLearningCount: number;
  avgDurationMinutes: number;
}

/**
 * 知识点热度项
 */
export interface KnowledgeHeatItem {
  knowledgePointId: string;
  code: string;
  name: string;
  learnCount: number;
  uniqueStudentCount: number;
}

/**
 * 知识点热度响应
 */
export interface KnowledgeHeatDto {
  heatList: KnowledgeHeatItem[];
}

/**
 * 学生对比项
 */
export interface StudentComparisonItem {
  id: string;
  name: string;
  totalDuration: number;
  masteryStats: Record<string, number>;
}

/**
 * 学生对比响应
 */
export interface StudentComparisonDto {
  students: StudentComparisonItem[];
}

/**
 * 已学知识点项
 */
export interface LearnedKnowledgePointDto {
  knowledgePointId: string;
  code: string;
  name: string;
  lastMasteryLevel: 'A' | 'B' | 'C' | 'D' | 'E';
  lastLearningDate: string;
}

/**
 * 已学知识点列表响应
 */
export interface LearnedKnowledgePointsDto {
  learnedKnowledgePoints: LearnedKnowledgePointDto[];
}

/**
 * 知识点进度记录
 */
export interface ProgressRecordDto {
  date: string;
  masteryLevel: string;
  durationMinutes: number;
  notes?: string;
}

/**
 * 知识点掌握进度响应
 */
export interface KnowledgePointProgressDto {
  knowledgePointId: string;
  code: string;
  title: string;
  level1: string;
  level2?: string;
  level3?: string;
  progressRecords: ProgressRecordDto[];
}
