import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KnowledgeNodePopover } from '../KnowledgeNodePopover'
import type { KnowledgeTreeNode } from '../types'

const mockNode: KnowledgeTreeNode = {
  key: '1.1.1',
  title: '集合的含义',
  code: '1.1.1',
  importanceLevel: 'A',
  learningStatus: 'mastered',
  isLeaf: true,
  data: {
    id: 'kp-1',
    code: '1.1.1',
    level1: '集合与逻辑',
    importanceLevel: 'A',
    textbookId: 'tb-1',
    definition: '一般地，我们把研究对象统称为元素，把一些元素组成的总体叫做集合。',
  },
}

describe('KnowledgeNodePopover', () => {
  it('renders title, importance, and definition', () => {
    render(<KnowledgeNodePopover node={mockNode} visible={true} />)
    expect(screen.getByText('集合的含义')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText(/一般地，我们把研究对象/)).toBeInTheDocument()
  })

  it('shows "暂无定义" when no definition', () => {
    const nodeWithoutDef = { ...mockNode, data: { ...mockNode.data, definition: undefined } }
    render(<KnowledgeNodePopover node={nodeWithoutDef} visible={true} />)
    expect(screen.getByText('暂无定义')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    const { container } = render(<KnowledgeNodePopover node={mockNode} visible={false} />)
    expect(container.firstChild).toBeNull()
  })
})
