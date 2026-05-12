import { describe, it, expect } from 'vitest'

describe('KnowledgeTree types', () => {
  it('LayoutMode accepts tree and balanced', () => {
    const treeMode: import('../types').LayoutMode = 'tree'
    const balancedMode: import('../types').LayoutMode = 'balanced'
    expect(treeMode).toBe('tree')
    expect(balancedMode).toBe('balanced')
  })

  it('MindMapNodeLayout accepts direction field', () => {
    const node: import('../types').MindMapNodeLayout = {
      id: '1',
      x: 0,
      y: 0,
      width: 140,
      height: 40,
      data: {
        key: '1',
        title: 'Test',
        code: '1',
        importanceLevel: 'A',
        data: { id: 'kp-1', textbookId: 'tb-1' },
      },
      depth: 0,
      direction: 'left',
    }
    expect(node.direction).toBe('left')
  })
})
