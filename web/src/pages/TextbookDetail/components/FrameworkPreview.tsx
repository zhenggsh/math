import React, { useEffect, useMemo, useRef } from 'react'
import { Table, Typography, Empty } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  highlightedCode?: string
  onRowClick?: (code: string) => void
}

// 编号列别名（与后端 parser 一致）：预览行对象的 key 是原始表头
const CODE_HEADERS = ['知识点编号', '编号', 'code']

function getRecordCode(record: XlsxPreviewRow): string | undefined {
  for (const header of CODE_HEADERS) {
    const value = record[header]
    if (value && value.trim() !== '') {
      return value.trim()
    }
  }
  return undefined
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  highlightedCode,
  onRowClick,
}) => {
  const tableRef = useRef<HTMLDivElement>(null)

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

  const columns = useMemo(() => {
    const baseColumns =
      rows.length > 0
        ? Object.keys(rows[0]).map(key => {
            const isCodeColumn = CODE_HEADERS.includes(key)
            return {
              title: key,
              dataIndex: key,
              key,
              ellipsis: true,
              render: isCodeColumn
                ? (value: string, record: XlsxPreviewRow) => {
                    const code = getRecordCode(record)
                    if (!code) {
                      return value
                    }
                    return (
                      <Typography.Link
                        onClick={e => {
                          e.stopPropagation()
                          onRowClick?.(code)
                        }}
                      >
                        {value}
                      </Typography.Link>
                    )
                  }
                : undefined,
            }
          })
        : []
    // 原样展示 xlsx 内容，不附加状态列
    return baseColumns
  }, [rows, onRowClick])

  useEffect(() => {
    if (!highlightedCode || !tableRef.current) {
      return
    }
    const element = tableRef.current.querySelector(
      `[data-row-key="framework-row-${highlightedCode}"]`
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedCode])

  if (rows.length === 0) {
    return <Empty description="选择文件后在此处预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div ref={tableRef}>
      <Table
        dataSource={rows}
        columns={columns}
        rowKey={record => {
          const code = getRecordCode(record)
          return code ? `framework-row-${code}` : JSON.stringify(record)
        }}
        pagination={false}
        size="small"
        sticky
        scroll={{ x: 'max-content' }}
        onRow={record => ({
          onClick: () => {
            const code = getRecordCode(record)
            if (code && onRowClick) {
              onRowClick(code)
            }
          },
          style: { cursor: getRecordCode(record) ? 'pointer' : 'default' },
        })}
        rowClassName={record => {
          const code = getRecordCode(record)
          const classes: string[] = []
          if (code && errorMap.has(code)) {
            classes.push('framework-row-error')
          }
          if (code && code === highlightedCode) {
            classes.push('framework-row-highlighted')
          }
          return classes.join(' ')
        }}
      />
    </div>
  )
}

export default FrameworkPreview
