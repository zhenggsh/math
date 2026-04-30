import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TreeView } from '../TreeView'
import type { KnowledgeTreeNode } from '../types'

const mockData: KnowledgeTreeNode[] = [
  {
    key: '1',
    title: '集合与常用逻辑用语',
    code: '1',
    importanceLevel: 'A',
    children: [
      {
        key: '1.1',
        title: '集合的概念与表示',
        code: '1.1',
        importanceLevel: 'A',
        children: [
          {
            key: '1.1.1',
            title: '集合的含义',
            code: '1.1.1',
            importanceLevel: 'A',
            isLeaf: true,
            data: { id: 'kp-1', textbookId: 'tb-1' },
          },
        ],
      },
    ],
  },
  {
    key: '2',
    title: '函数',
    code: '2',
    importanceLevel: 'B',
    isLeaf: true,
    data: { id: 'kp-2', textbookId: 'tb-1' },
  },
]

describe('TreeView', () => {
  it('renders loading state', () => {
    render(<TreeView data={[]} loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<TreeView data={[]} />)
    expect(screen.getByText('No knowledge points')).toBeInTheDocument()
  })

  it('renders tree nodes with titles', () => {
    render(<TreeView data={mockData} />)
    expect(screen.getByText('集合与常用逻辑用语')).toBeInTheDocument()
    expect(screen.getByText('函数')).toBeInTheDocument()
  })

  it('calls onSelect when a node is clicked', () => {
    const onSelect = vi.fn()
    render(<TreeView data={mockData} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('函数'))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        key: '2',
        title: '函数',
      })
    )
  })

  it('calls onExpand when expand/collapse is triggered', () => {
    const onExpand = vi.fn()
    render(<TreeView data={mockData} onExpand={onExpand} />)

    fireEvent.click(screen.getByText('Expand All'))
    expect(onExpand).toHaveBeenCalledWith(expect.arrayContaining(['1', '1.1', '1.1.1', '2']))

    fireEvent.click(screen.getByText('Collapse All'))
    expect(onExpand).toHaveBeenCalledWith([])
  })

  it('keyboard navigation: ArrowUp/ArrowDown moves selection', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <TreeView
        data={mockData}
        selectedKey="1.1.1"
        defaultExpandedKeys={['1', '1.1']}
        onSelect={onSelect}
      />
    )

    const treeView = container.querySelector('[tabindex="0"]')
    expect(treeView).toBeTruthy()

    fireEvent.keyDown(treeView!, { key: 'ArrowUp' })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: '1.1' }))

    fireEvent.keyDown(treeView!, { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: '2' }))
  })

  it('expand all / collapse all buttons work', () => {
    const onExpand = vi.fn()
    render(<TreeView data={mockData} onExpand={onExpand} />)

    fireEvent.click(screen.getByText('Expand All'))
    expect(onExpand).toHaveBeenCalledWith(['1', '1.1', '1.1.1', '2'])

    onExpand.mockClear()
    fireEvent.click(screen.getByText('Collapse All'))
    expect(onExpand).toHaveBeenCalledWith([])
  })
})
