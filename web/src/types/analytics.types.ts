/**
 * 学生学习概览
 */
export interface StudentOverview {
  totalLearningCount: number;
  totalDurationMinutes: number;
  uniqueKnowledgePoints: number;
}

/**
 * 掌握程度分布项
 */
export interface MasteryDistributionItem {
  level: 'A' | 'B' | 'C' | 'D' | 'E';
  count: number;
  percentage: number;
}

/**
 * 掌握程度分布
 */
export interface MasteryDistribution {
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
 * 学习趋势
 */
export interface LearningTrend {
  trend: LearningTrendItem[];
}

/**
 * 薄弱知识点
 */
export interface WeakPoint {
  knowledgePointId: string;
  code: string;
  name: string;
  importanceLevel: 'A' | 'B' | 'C';
  lastMasteryLevel: 'D' | 'E';
  lastLearningDate: string;
}

/**
 * 薄弱知识点列表
 */
export interface WeakPoints {
  weakPoints: WeakPoint[];
}

/**
 * 班级概览
 */
export interface ClassOverview {
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
 * 知识点热度
 */
export interface KnowledgeHeat {
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
 * 学生对比
 */
export interface StudentComparison {
  students: StudentComparisonItem[];
}

/**
 * 图表数据类型
 */
export interface PieChartData {
  name: string;
  value: number;
}

export interface BarChartData {
  name: string;
  value: number;
}

export interface LineChartData {
  date: string;
  value: number;
}

/**
 * 知识点进度记录
 */
export interface ProgressRecord {
  date: string;
  masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E';
  durationMinutes: number;
  notes?: string;
}

/**
 * 知识点进度
 */
export interface KnowledgePointProgress {
  knowledgePointId: string;
  code: string;
  title: string;
  level1: string;
  level2?: string;
  level3?: string;
  progressRecords: ProgressRecord[];
}

/**
 * ECharts 主题配置
 */
export interface EChartsTheme {
  colors: string[];
  backgroundColor: string;
  textStyle: {
    color: string;
  };
}

/**
 * Ant Design 配色方案
 */
export const ANT_DESIGN_COLORS = {
  primary: '#1890FF',
  success: '#52C41A',
  warning: '#FAAD14',
  error: '#F5222D',
  mastery: {
    A: '#52C41A',
    B: '#73D13D',
    C: '#FAAD14',
    D: '#FA8C16',
    E: '#F5222D',
  },
};
