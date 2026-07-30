import { describe, it, expect } from 'vitest'
import {
  parseKnowledgeBlocks,
  updateBlockForRow,
  deleteBlockForRow,
  insertBlockForRow,
  serializeKnowledgeBlocks,
  type EditorRow,
} from '../knowledgeBlocks'

const sampleMd = [
  '## 1 集合',
  '',
  '一级描述',
  '',
  '### 1.1 集合的概念',
  '',
  '二级描述',
  '',
  '#### 知识点 1.1.1：集合的含义',
  '',
  '旧三级内容',
  '',
].join('\n')

function row(code: string, name: string): EditorRow {
  return {
    rowId: `row-${code}`,
    知识点编号: code,
    知识点名称: name,
    一级知识点: '集合',
    二级知识点: '集合的概念',
  }
}

describe('parseKnowledgeBlocks', () => {
  it('splits markdown into level blocks', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)

    expect(blocks).toHaveLength(3)
    expect(blocks[0].level).toBe(2)
    expect(blocks[0].code).toBe('1')
    expect(blocks[2].level).toBe(4)
    expect(blocks[2].code).toBe('1.1.1')
    expect(blocks[2].content).toBe('旧三级内容')
  })
})

describe('updateBlockForRow', () => {
  it('updates existing block heading and preserves content', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)
    const targetId = blocks[2].id
    const updated = updateBlockForRow(blocks, row('1.1.1', '集合的含义（新名称）'), targetId)

    expect(updated.find(b => b.id === targetId)?.heading).toBe(
      '#### 知识点 1.1.1：集合的含义（新名称）'
    )
    expect(updated.find(b => b.id === targetId)?.content).toBe('旧三级内容')
  })
})

describe('deleteBlockForRow', () => {
  it('removes the mapped block', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)
    const targetId = blocks[2].id
    const updated = deleteBlockForRow(blocks, targetId)

    expect(updated.find(b => b.id === targetId)).toBeUndefined()
    expect(updated).toHaveLength(2)
  })
})

describe('insertBlockForRow', () => {
  it('inserts under parent level-2 block', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)
    const updated = insertBlockForRow(blocks, row('1.1.2', '元素与集合的关系'))

    const index = updated.findIndex(b => b.code === '1.1.2')
    expect(index).toBeGreaterThan(-1)
    expect(updated[index].level).toBe(4)
    expect(updated[index].heading).toBe('#### 知识点 1.1.2：元素与集合的关系')
    // 1.1.2 应出现在 1.1.1 之后、1.1 块之后
    expect(index).toBeGreaterThan(updated.findIndex(b => b.code === '1.1.1'))
  })

  it('appends to end when parent not found', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)
    const updated = insertBlockForRow(blocks, row('2.1.1', '新知识点'))

    expect(updated[updated.length - 1].code).toBe('2.1.1')
  })
})

describe('serializeKnowledgeBlocks', () => {
  it('reconstructs markdown with normalized blank lines', () => {
    const blocks = parseKnowledgeBlocks(sampleMd)
    const md = serializeKnowledgeBlocks(blocks)

    expect(md).toContain('## 1 集合')
    expect(md).toContain('#### 知识点 1.1.1：集合的含义')
    expect(md).toContain('旧三级内容')
  })
})
