/**
 * 教材类型定义
 */

import type { EditorRow } from '../utils/knowledgeBlocks'
import type { XlsxPreviewRow } from '../utils/textbookFilePreview'

// 教材基础信息
export interface Textbook {
  id: string
  name: string
  fileName: string
  frameworkType: 'xlsx' | 'csv'
  hasContent: boolean
  knowledgePointCount: number
  lastModifiedAt: string
  createdAt: string
}

// 教材详细信息
export interface TextbookDetail extends Textbook {
  frameworkPath: string
  contentPath: string | null
}

// 同步结果
export interface SyncResult {
  added: string[]
  updated: string[]
  removed: string[]
}

// 上传结果
export interface UploadResult {
  success: boolean
  message: string
  data?: {
    fileName: string
    frameworkType: 'xlsx' | 'csv'
  }
}

// 扩充知识点结果
export interface ExpandResult {
  success: boolean
  message: string
  data?: {
    addedCodes: string[]
    count: number
  }
}

// 文件树节点
export interface FileTreeNode {
  title: string
  key: string
  children?: FileTreeNode[]
  isLeaf?: boolean
}

// 上传文件信息
export interface UploadFileInfo {
  frameworkFile: File | null
  contentFile: File | null
  baseName: string
}

// 校验问题定位
export interface ValidationIssueLocation {
  file: 'xlsx' | 'md'
  row?: number
  code?: string
}

// 校验问题
export interface ValidationIssue {
  type: 'xlsx' | 'md'
  location: ValidationIssueLocation
  message: string
}

// 单项校验结果（逐项提示：通过 ✓ / 不通过 ✗）
export interface ValidationCheck {
  key: string // 检查项标识
  label: string // 检查项名称
  passed: boolean // 是否通过
  errors: ValidationIssue[] // 该检查项的问题（通过时为空）
}

// 校验报告
export interface ValidationReport {
  valid: boolean
  errors: ValidationIssue[]
  checks: ValidationCheck[]
}

// 扩充弹窗草稿
export interface ExpansionDraft {
  textbookId: string
  frameworkFileName?: string
  frameworkFileContent?: string
  contentFileName?: string
  contentFileContent?: string
  editedFrameworkRows?: EditorRow[]
  editedMdContent?: string
  originalFrameworkFingerprint?: string
  originalContentFingerprint?: string
}

/** GET /textbooks/:id/framework-file 响应 */
export interface FrameworkFileContent {
  fileName: string
  fileType: 'xlsx' | 'csv'
  sheetName?: string
  rows: XlsxPreviewRow[]
  totalRows: number
  lastModifiedAt: string
}

/** GET /textbooks/:id/content-file 响应 */
export interface ContentFileContent {
  fileName: string | null
  content: string
  totalLines: number
  lastModifiedAt: string | null
  empty: boolean
}

// 分歧问题类型
export type DivergenceIssueType = 'missing-in-db' | 'missing-in-file' | 'changed'

// 单个字段变更
export interface DivergenceFieldChange {
  field: string
  fileValue: string
  dbValue: string
}

// 分歧问题（文件与数据库差异）
export interface DivergenceIssue {
  code: string
  type: DivergenceIssueType
  fileRow: Record<string, string> | null
  dbRow: Record<string, string> | null
  changes: DivergenceFieldChange[] | null
}

// 分歧报告
export interface DivergenceReport {
  diverged: boolean
  issues: DivergenceIssue[]
}
