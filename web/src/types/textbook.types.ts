/**
 * 教材类型定义
 */

// 教材基础信息
export interface Textbook {
  id: string;
  name: string;
  fileName: string;
  frameworkType: 'xlsx' | 'csv';
  hasContent: boolean;
  knowledgePointCount: number;
  lastModifiedAt: string;
  createdAt: string;
}

// 教材详细信息
export interface TextbookDetail extends Textbook {
  frameworkPath: string;
  contentPath: string | null;
}

// 同步结果
export interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
}

// 上传结果
export interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    frameworkType: 'xlsx' | 'csv';
  };
}

// 文件树节点
export interface FileTreeNode {
  title: string;
  key: string;
  children?: FileTreeNode[];
  isLeaf?: boolean;
}

// 上传文件信息
export interface UploadFileInfo {
  frameworkFile: File | null;
  contentFile: File | null;
  baseName: string;
}
