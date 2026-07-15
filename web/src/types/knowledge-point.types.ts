import type { ImportanceLevel, KnowledgePoint } from './knowledge.types'

export interface ParentKnowledgeNode {
  id: string
  code: string
  title: string
}

export interface CreateKnowledgePointDto {
  parentId: string
  code: string
  name: string
  definition?: string
  characteristics?: string
  importanceLevel: ImportanceLevel
}

export interface UpdateKnowledgePointDto {
  code?: string
  name?: string
  definition?: string
  characteristics?: string
  importanceLevel?: ImportanceLevel
}

export type { KnowledgePoint }
