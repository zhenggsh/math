/**
 * 教材相关类型定义
 */

// 教材框架文件类型
export type FrameworkType = 'xlsx' | 'csv';

// 知识点原始数据（从框架文件解析）
export interface RawKnowledgePoint {
  code: string; // 知识点编号
  level1: string; // 一级知识点
  level2?: string; // 二级知识点
  level3?: string; // 三级知识点
  definition?: string; // 定义
  characteristics?: string; // 特性/运算方式
  importanceLevel: 'A' | 'B' | 'C'; // 重要性级别
}

// 教材文件对
export interface TextbookFilePair {
  frameworkPath: string;
  frameworkType: FrameworkType;
  contentPath?: string;
  lastModifiedAt: Date;
}

// 文件解析结果
export interface ParseResult {
  success: boolean;
  data?: RawKnowledgePoint[];
  error?: string;
}

// 教材详细信息
export interface TextbookDetail {
  id: string;
  name: string;
  fileName: string;
  frameworkType: FrameworkType;
  hasContent: boolean;
  knowledgePointCount: number;
  lastModifiedAt: Date;
  createdAt: Date;
}

// 文件上传选项
export interface FileUploadOptions {
  maxFileSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的文件类型
}

// 文件过滤选项
export interface FileFilterOptions {
  fieldName: string;
  originalName: string;
  mimetype: string;
  size: number;
}
