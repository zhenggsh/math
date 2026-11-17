import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Table, Typography, Empty, Button, Space, Tooltip, Popconfirm } from 'antd'
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ValidationIssue, DivergenceIssue } from '../../types/textbook.types'
import { getRecordCode, type XlsxPreviewRow } from '../../utils/textbookFilePreview'
import styles from './FrameworkPreview.module.css'

interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  highlightedCodes?: string[]
  emptyDescription?: string
  onRowClick?: (code: string) => void
  canEdit?: boolean
  fileDiverged?: boolean
  divergenceIssues?: DivergenceIssue[]
  onEdit?: (row: XlsxPreviewRow) => void
  onAddChild?: (row: XlsxPreviewRow) => void
  onDelete?: (row: XlsxPreviewRow) => void
  /** 受控选中编号；传入后行选中态由父组件管理 */
  selectedCode?: string | null
  /** 隐藏组件内联工具栏（按钮上移到父级标题栏时使用） */
  hideToolbar?: boolean
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  highlightedCodes,
  emptyDescription = '选择文件后在此处预览',
  onRowClick,
  canEdit = false,
  fileDiverged = false,
  divergenceIssues = [],
  onEdit,
  onAddChild,
  onDelete,
  selectedCode: controlledSelectedCode,
  hideToolbar = false,
}) => {
  const tableRef = useRef<HTMLDivElement>(null)
  const [internalSelectedRowKey, setInternalSelectedRowKey] = useState<string | null>(null)
  const selectedRowKey = controlledSelectedCode !== undefined ? controlledSelectedCode : internalSelectedRowKey

  const getRowKey = (record: XlsxPreviewRow): string => {
    const code = getRecordCode(record)
    return code ? `framework-row-${code}` : JSON.stringify(record)
  }

  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>()
    errors.forEach(err => {
      if (err.location.code) {
        const list = map.get(err.location.code) || []
        list.push(err)
        map.set(err.location.code, list)
      }
    })
    return map
  }, [errors])

  const divergenceMap = useMemo(() => {
    const map = new Map<string, DivergenceIssue>()
    divergenceIssues.forEach(issue => {
      map.set(issue.code, issue)
    })
    return map
  }, [divergenceIssues])

  const selectedRecord = useMemo(() => {
    if (!selectedRowKey) {
      return undefined
    }
    return rows.find(row => getRecordCode(row) === selectedRowKey)
  }, [selectedRowKey, rows])

  const selectedCode = useMemo(() => {
    return selectedRecord ? getRecordCode(selectedRecord) : undefined
  }, [selectedRecord])

  const selectedCodeDepth = useMemo(() => {
    return selectedCode ? selectedCode.split('.').length : 0
  }, [selectedCode])

  const selectedIsLeaf = useMemo(() => {
    if (!selectedCode) {
      return false
    }
    return !rows.some(otherRow => {
      const otherCode = getRecordCode(otherRow)
      return (
        otherCode !== undefined &&
        otherCode !== selectedCode &&
        otherCode.startsWith(`${selectedCode}.`)
      )
    })
  }, [rows, selectedCode])

  const getDivergenceTooltip = (issue: DivergenceIssue | undefined): string => {
    if (!issue) {
      return ''
    }
    const fieldLabels: Record<string, string> = {
      name: '知识点名称',
      level1: '一级知识点',
      level2: '二级知识点',
      level3: '三级知识点',
      definition: '定义',
      characteristics: '特性',
      importanceLevel: '重要性级别',
    }
    switch (issue.type) {
      case 'missing-in-db':
        return '该知识点在数据库中不存在'
      case 'missing-in-file':
        return '该知识点在当前框架文件中不存在'
      case 'changed':
        return `字段不一致：${issue.changes?.map(change => fieldLabels[change.field] ?? change.field).join('、') ?? ''}`
      default:
        return ''
    }
  }

  const columns = useMemo(() => {
    if (rows.length === 0) {
      return []
    }
    return Object.keys(rows[0]).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
    }))
  }, [rows])

  const divergenceTooltip = fileDiverged ? '文件与数据库不一致，请先重新加载' : undefined

  const actionDisabled = fileDiverged || !selectedRecord
  const noSelectionTooltip = !selectedRecord ? '请先选择一行' : undefined

  const addChildDisabled = actionDisabled || selectedCodeDepth >= 3
  const addChildTooltip = fileDiverged
    ? divergenceTooltip
    : selectedCodeDepth >= 3
      ? '三级知识点不能添加子节点'
      : noSelectionTooltip

  const deleteDisabled = actionDisabled || !selectedIsLeaf
  const deleteTooltip = fileDiverged
    ? divergenceTooltip
    : !selectedIsLeaf
      ? '存在子节点，不能删除'
      : noSelectionTooltip

  const toolbar = canEdit && !hideToolbar ? (
    <Space style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary">选中：{selectedCode ?? '无'}</Typography.Text>
      <Tooltip title={divergenceTooltip ?? noSelectionTooltip}>
        <span>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label="编辑概要"
            disabled={actionDisabled}
            onClick={() => selectedRecord && onEdit?.(selectedRecord)}
          >
            编辑概要
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={addChildTooltip}>
        <span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            aria-label="新增子知识点"
            disabled={addChildDisabled}
            onClick={() => selectedRecord && onAddChild?.(selectedRecord)}
          >
            新增子知识点
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={deleteTooltip}>
        <span>
          {deleteDisabled ? (
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="删除" disabled>
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确认删除"
              description={`确定要删除知识点 ${selectedCode} 吗？`}
              onConfirm={() => selectedRecord && onDelete?.(selectedRecord)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />} aria-label="删除">
                删除
              </Button>
            </Popconfirm>
          )}
        </span>
      </Tooltip>
    </Space>
  ) : null

  const handleRowClick = (code: string) => {
    setInternalSelectedRowKey(code)
    onRowClick?.(code)
  }

  // 滚动定位到第一个高亮行（highlight 作用于全部 highlightedCodes，scroll 只到首个）
  const scrollTarget = highlightedCodes?.[0]

  useEffect(() => {
    if (!scrollTarget || !tableRef.current) {
      return
    }
    const element = tableRef.current.querySelector(`[data-row-key="framework-row-${scrollTarget}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollTarget, rows])

  if (rows.length === 0) {
    return <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div ref={tableRef}>
      {toolbar}
      <Table
        dataSource={rows}
        columns={columns}
        rowKey={getRowKey}
        pagination={false}
        size="small"
        sticky
        scroll={{ x: 'max-content' }}
        onRow={record => {
          const code = getRecordCode(record)
          const issue = code ? divergenceMap.get(code) : undefined
          return {
            onClick: () => {
              if (code) {
                handleRowClick(code)
              }
            },
            style: { cursor: code ? 'pointer' : 'default' },
            title: issue ? getDivergenceTooltip(issue) : undefined,
          }
        }}
        rowClassName={record => {
          const code = getRecordCode(record)
          const issue = code ? divergenceMap.get(code) : undefined
          const classes: string[] = []
          if (code && errorMap.has(code)) {
            classes.push('framework-row-error')
          }
          if (code && highlightedCodes?.includes(code)) {
            classes.push('framework-row-highlighted')
          }
          if (code && selectedRowKey === code) {
            classes.push(styles['framework-row-selected'])
          }
          if (issue) {
            classes.push(styles[`framework-row-${issue.type}`])
          }
          return classes.join(' ')
        }}
      />
    </div>
  )
}

export default FrameworkPreview
