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
    const result = calculateLayout(data, 3, new Set(), new Set(), 'tree')
    expect(result.layout).toHaveLength(1)
    expect(result.layout[0].children).toHaveLength(2)
    expect(result.layout[0].children![0].x).toBeGreaterThan(result.layout[0].x)
    expect(result.layout[0].children![1].x).toBeGreaterThan(result.layout[0].x)
  })

  it('balanced layout splits children left and right', () => {
    const data = [
      createNode('root', [createNode('c1'), createNode('c2'), createNode('c3'), createNode('c4')]),
    ]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    const root = result.layout[0]
    expect(root.children).toHaveLength(4)
    expect(root.children![0].x).toBeLessThan(root.x)
    expect(root.children![1].x).toBeLessThan(root.x)
    expect(root.children![2].x).toBeGreaterThan(root.x)
    expect(root.children![3].x).toBeGreaterThan(root.x)
  })

  it('balanced layout with odd children count puts more on left', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2'), createNode('c3')])]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    const root = result.layout[0]
    expect(root.children).toHaveLength(3)
    expect(root.children![0].x).toBeLessThan(root.x)
    expect(root.children![1].x).toBeLessThan(root.x)
    expect(root.children![2].x).toBeGreaterThan(root.x)
  })

  it('returns positive coordinates after normalization', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2')])]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
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
    const result = calculateLayout(data, 3, new Set(), new Set(), 'tree')
    expect(result.layout).toHaveLength(2)
    expect(result.layout[1].y).toBeGreaterThan(result.layout[0].y)
    // Verify children maintain correct relative position to their parent
    const offset0 = result.layout[0].children![0].y - result.layout[0].y
    const offset1 = result.layout[1].children![0].y - result.layout[1].y
    expect(offset1).toBe(offset0)
  })

  it('balanced layout sets hasLeftChildren and hasRightChildren', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2'), createNode('c3'), createNode('c4')])]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    const root = result.layout[0]
    expect(root.hasLeftChildren).toBe(true)
    expect(root.hasRightChildren).toBe(true)
  })

  it('tree layout only sets hasRightChildren', () => {
    const data = [createNode('root', [createNode('c1'), createNode('c2')])]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'tree')
    const root = result.layout[0]
    expect(root.hasLeftChildren).toBe(false)
    expect(root.hasRightChildren).toBe(true)
  })

  it('balanced layout only splits root left/right, deeper nodes inherit direction', () => {
    const data = [
      createNode('root', [
        createNode('c1', [createNode('c1-1'), createNode('c1-2')]),
        createNode('c2', [createNode('c2-1'), createNode('c2-2')]),
      ]),
    ]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    const root = result.layout[0]
    const c1 = root.children![0]
    // root has 2 children, splits left/right
    expect(root.hasLeftChildren).toBe(true)
    expect(root.hasRightChildren).toBe(true)
    expect(root.children).toHaveLength(2)
    // c1 is a left child, so all its children stay on the left
    expect(c1.hasLeftChildren).toBe(true)
    expect(c1.hasRightChildren).toBe(false)
    expect(c1.children).toHaveLength(2)
    expect(c1.children![0].x).toBeLessThan(c1.x)
    expect(c1.children![1].x).toBeLessThan(c1.x)
  })

  it('does not overlap nodes after collapse', () => {
    const data = [
      createNode('root', [
        createNode('c1', [createNode('c1-1'), createNode('c1-2')]),
        createNode('c2', [createNode('c2-1'), createNode('c2-2')]),
      ]),
    ]
    // Expanded
    const expanded = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    // Collapse left side of root
    const collapsedLeft = calculateLayout(data, 3, new Set(['root']), new Set(), 'balanced')
    // Collapsed layout should have smaller or equal height
    expect(collapsedLeft.svgHeight).toBeLessThanOrEqual(expanded.svgHeight)
    // No node overlap in expanded state
    const rects: Array<{ x: number; y: number; w: number; h: number }> = []
    const collectRects = (node: import('../types').MindMapNodeLayout) => {
      rects.push({ x: node.x, y: node.y, w: node.width, h: node.height })
      node.children?.forEach(collectRects)
    }
    expanded.layout.forEach(collectRects)
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
        expect(overlap).toBe(false)
      }
    }
  })

  it('left and right subtrees arrange independently in balanced mode', () => {
    const data = [
      createNode('root', [
        createNode('c1'),
        createNode('c2'),
        createNode('c3'),
        createNode('c4'),
        createNode('c5'),
        createNode('c6'),
      ]),
    ]
    const result = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    const root = result.layout[0]
    // 3 left, 3 right
    const leftChildren = root.children!.filter(c => c.x < root.x)
    const rightChildren = root.children!.filter(c => c.x > root.x)
    expect(leftChildren).toHaveLength(3)
    expect(rightChildren).toHaveLength(3)
    // Both sides should start from roughly the same top Y (independently centered)
    // The first child on each side should be above the root
    expect(leftChildren[0].y).toBeLessThan(root.y)
    expect(rightChildren[0].y).toBeLessThan(root.y)
    // Both sides flow top-to-bottom
    expect(leftChildren[1].y).toBeGreaterThan(leftChildren[0].y)
    expect(rightChildren[1].y).toBeGreaterThan(rightChildren[0].y)
  })

  it('independent left/right collapse: collapsing left does not hide right children', () => {
    const data = [
      createNode('root', [
        createNode('c1'),
        createNode('c2'),
        createNode('c3'),
        createNode('c4'),
      ]),
    ]
    // Both expanded
    const expanded = calculateLayout(data, 3, new Set(), new Set(), 'balanced')
    expect(expanded.layout[0].children).toHaveLength(4)

    // Collapse left side only
    const leftCollapsed = calculateLayout(data, 3, new Set(['root']), new Set(), 'balanced')
    // Only right children visible
    expect(leftCollapsed.layout[0].children).toHaveLength(2)
    expect(leftCollapsed.layout[0].children![0].x).toBeGreaterThan(leftCollapsed.layout[0].x)
    expect(leftCollapsed.layout[0].children![1].x).toBeGreaterThan(leftCollapsed.layout[0].x)

    // Collapse right side only
    const rightCollapsed = calculateLayout(data, 3, new Set(), new Set(['root']), 'balanced')
    // Only left children visible
    expect(rightCollapsed.layout[0].children).toHaveLength(2)
    expect(rightCollapsed.layout[0].children![0].x).toBeLessThan(rightCollapsed.layout[0].x)
    expect(rightCollapsed.layout[0].children![1].x).toBeLessThan(rightCollapsed.layout[0].x)

    // Collapse both sides
    const bothCollapsed = calculateLayout(data, 3, new Set(['root']), new Set(['root']), 'balanced')
    expect(bothCollapsed.layout[0].children).toHaveLength(0)
  })

  it('independent left/right collapse: collapse state does not propagate to grandchildren', () => {
    const data = [
      createNode('root', [
        createNode('c1', [createNode('c1-1')]),
        createNode('c2', [createNode('c2-1')]),
      ]),
    ]
    // Collapse left side of root only
    const result = calculateLayout(data, 3, new Set(['root']), new Set(), 'balanced')
    const root = result.layout[0]
    // Only right children visible
    expect(root.children).toHaveLength(1)
    expect(root.children![0].id).toBe('c2')
    // c2's children should still be visible (right side not collapsed)
    expect(root.children![0].children).toHaveLength(1)
    expect(root.children![0].children![0].id).toBe('c2-1')
  })
})
