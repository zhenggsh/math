/**
 * 教材相关类型定义
 */

// 教材框架文件类型
export type FrameworkType = 'xlsx' | 'csv';

// 知识点原始数据（从框架文件解析）
export interface RawKnowledgePoint {
  code: string; // 知识点编号
  name?: string; // 知识点名称
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
  explicitCodes?: string[];
  rawRecords?: Record<string, string>[];
  sheetName?: string; // xlsx 时：检测到的框架 sheet 名
  error?: string;
}

// 框架文件预览内容（GET /textbooks/:id/framework-file 响应 data）
export interface FrameworkFileContent {
  fileName: string;
  fileType: FrameworkType;
  sheetName?: string; // xlsx 时：检测到的框架 sheet 名
  rows: Record<string, string>[]; // 全量行，不截断
  totalRows: number;
  lastModifiedAt: Date; // 磁盘文件 mtime
}

// 内容文件预览内容（GET /textbooks/:id/content-file 响应 data）
export interface ContentFileContent {
  fileName: string | null;
  content: string; // md 原文
  totalLines: number;
  lastModifiedAt: Date | null;
  empty: boolean; // contentPath 为空时为 true
}

// 检测到的知识点框架 sheet（xlsx）
export interface DetectedFrameworkSheet {
  sheetName: string;
  records: Record<string, string>[];
}

// 校验问题定位
export interface ValidationIssueLocation {
  file: 'xlsx' | 'md';
  row?: number;
  code?: string;
}

// 校验问题
export interface ValidationIssue {
  type: 'xlsx' | 'md';
  location: ValidationIssueLocation;
  message: string;
}

// 单项校验结果（逐项提示：通过 ✓ / 不通过 ✗）
export interface ValidationCheck {
  key: string; // 检查项标识
  label: string; // 检查项名称
  passed: boolean; // 是否通过
  errors: ValidationIssue[]; // 该检查项的问题（通过时为空）
}

// 校验报告
export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  checks: ValidationCheck[];
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
