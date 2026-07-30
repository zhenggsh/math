import { generateId } from './generateId'
import type { XlsxPreviewRow } from './textbookFilePreview'
import { getRecordCode } from './textbookFilePreview'

export interface EditorRow extends XlsxPreviewRow {
  rowId: string
}

export interface KnowledgeBlock {
  id: string
  level: number
  code: string
  name: string
  heading: string
  content: string
  raw: string
}

interface CurrentBlock {
  lines: string[]
  heading: string
  level: number
  code: string
  name: string
}

const HEADING_PATTERN = /^(#{2,4})\s+(?:知识点\s+)?(\d+(?:\.\d+)*)(?:[：:]?\s*(.*))?$/

function buildHeading(level: number, code: string, name: string): string {
  const prefix = '#'.repeat(level)
  if (level === 4) {
    return `${prefix} 知识点 ${code}：${name}`
  }
  return `${prefix} ${code} ${name}`
}

/**
 * 解析 Markdown 内容为知识点块
 */
export function parseKnowledgeBlocks(content: string): KnowledgeBlock[] {
  const lines = content.split('\n')
  const blocks: KnowledgeBlock[] = []
  let current: CurrentBlock | null = null

  function pushCurrent(): void {
    if (!current) return
    const trimmedContent = current.lines.join('\n').trim()
    blocks.push({
      id: generateId(),
      level: current.level,
      code: current.code,
      name: current.name,
      heading: current.heading,
      content: trimmedContent,
      raw: trimmedContent ? `${current.heading}\n\n${trimmedContent}` : current.heading,
    })
  }

  for (const line of lines) {
    const match = line.match(HEADING_PATTERN)
    if (match) {
      pushCurrent()
      current = {
        heading: line,
        level: match[1].length,
        code: match[2],
        name: match[3] ?? '',
        lines: [],
      }
    } else if (current) {
      current.lines.push(line)
    }
  }
  pushCurrent()

  return blocks
}

/**
 * 更新已映射 block 的 heading（code/name 改变时）
 */
export function updateBlockForRow(
  blocks: KnowledgeBlock[],
  row: EditorRow,
  blockId: string
): KnowledgeBlock[] {
  const code = getRecordCode(row)
  const name = row['知识点名称'] ?? code ?? ''
  return blocks.map(block => {
    if (block.id !== blockId) return block
    const newCode = code ?? block.code
    const newName = name || block.name
    return {
      ...block,
      code: newCode,
      name: newName,
      heading: buildHeading(block.level, newCode, newName),
    }
  })
}

/**
 * 删除已映射 block
 */
export function deleteBlockForRow(blocks: KnowledgeBlock[], blockId: string): KnowledgeBlock[] {
  return blocks.filter(block => block.id !== blockId)
}

function findDescendantInsertIndex(blocks: KnowledgeBlock[], targetCode: string): number {
  const index = blocks.findIndex(block => block.code === targetCode)
  if (index === -1) return -1
  let insertIndex = index + 1
  while (insertIndex < blocks.length && blocks[insertIndex].code.startsWith(`${targetCode}.`)) {
    insertIndex++
  }
  return insertIndex
}

/**
 * 根据 code 层级推导最佳父 block，在其后插入新 block
 */
export function insertBlockForRow(blocks: KnowledgeBlock[], row: EditorRow): KnowledgeBlock[] {
  const code = getRecordCode(row)
  const name = row['知识点名称'] ?? code ?? ''
  if (!code) return blocks

  const parts = code.split('.')
  const level = Math.min(parts.length + 1, 4)
  const newBlock: KnowledgeBlock = {
    id: generateId(),
    level,
    code,
    name,
    heading: buildHeading(level, code, name),
    content: '[待输入]',
    raw: '',
  }

  const parentCode = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined
  const grandparentCode = parts.length > 2 ? parts.slice(0, -2).join('.') : undefined

  for (const targetCode of [parentCode, grandparentCode]) {
    if (!targetCode) continue
    const insertIndex = findDescendantInsertIndex(blocks, targetCode)
    if (insertIndex === -1) continue
    const next = [...blocks]
    next.splice(insertIndex, 0, newBlock)
    return next
  }

  return [...blocks, newBlock]
}

/**
 * 重新组装 Markdown 文本
 */
export function serializeKnowledgeBlocks(blocks: KnowledgeBlock[]): string {
  return blocks
    .map(block => {
      const body = block.content.trim()
      return body ? `${block.heading}\n\n${body}\n` : `${block.heading}\n`
    })
    .join('\n')
    .trim()
}
