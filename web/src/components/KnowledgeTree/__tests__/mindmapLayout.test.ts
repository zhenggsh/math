import { describe, it, expect } from 'vitest'
import { calculateLayout } from '../mindmapLayout'
import type { KnowledgeTreeNode } from '../types'

const createNode = (key: string, children?: KnowledgeTreeNode[]): KnowledgeTreeNode => ({
  key,
  title: key,
  code: key,
  importanceLevel: 'A',
  isLeaf: !children,
  children,
  data: { id: key, textbookId: 't' },
})

describe('mindmapLayout', () => {
  it('tree layout places all children to the right', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2')])]
    const result = calculateLayout(data, 3, new Set(), 'tree')
    expect(result.layout).toHaveLength(1)
    expect(result.layout[0].children).toHaveLength(2)
    expect(result.layout[0].children![0].x).toBeGreaterThan(result.layout[0].x)
    expect(result.layout[0].children![1].x).toBeGreaterThan(result.layout[0].x)
  })

  it('balanced layout splits children left and right', () => {
    const data = [
      createNode('root', [createNode('c1'), createNode('c2'), createNode('c3'), createNode('c4')]),
    ]
    const result = calculateLayout(data, 3, new Set(), 'balanced')
    const root = result.layout[0]
    expect(root.children).toHaveLength(4)
    expect(root.children![0].x).toBeLessThan(root.x)
    expect(root.children![1].x).toBeLessThan(root.x)
    expect(root.children![2].x).toBeGreaterThan(root.x)
    expect(root.children![3].x).toBeGreaterThan(root.x)
  })

  it('balanced layout with odd children count puts more on left', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2'), createNode('c3')])]
    const result = calculateLayout(data, 3, new Set(), 'balanced')
    const root = result.layout[0]
    expect(root.children).toHaveLength(3)
    expect(root.children![0].x).toBeLessThan(root.x)
    expect(root.children![1].x).toBeLessThan(root.x)
    expect(root.children![2].x).toBeGreaterThan(root.x)
  })

  it('returns positive coordinates after normalization', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2')])]
    const result = calculateLayout(data, 3, new Set(), 'balanced')
    expect(result.svgWidth).toBeGreaterThan(0)
    expect(result.svgHeight).toBeGreaterThan(0)
    const checkNode = (node: import('../types').MindMapNodeLayout) => {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      node.children?.forEach(checkNode)
    }
    result.layout.forEach(checkNode)
  })

  it('stacks multiple root nodes vertically', () => {
    const data = [createNode('root1', [createNode('c1')]), createNode('root2', [createNode('c2')])]
    const result = calculateLayout(data, 3, new Set(), 'tree')
    expect(result.layout).toHaveLength(2)
    expect(result.layout[1].y).toBeGreaterThan(result.layout[0].y)
    // Verify children maintain correct relative position to their parent
    const offset0 = result.layout[0].children![0].y - result.layout[0].y
    const offset1 = result.layout[1].children![0].y - result.layout[1].y
    expect(offset1).toBe(offset0)
  })
})
