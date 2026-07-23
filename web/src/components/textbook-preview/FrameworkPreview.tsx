import React, { useEffect, useMemo, useRef } from 'react'
import { Table, Typography, Empty } from 'antd'
import type { ValidationIssue } from '../../types/textbook.types'
import {
  CODE_HEADERS,
  getRecordCode,
  type XlsxPreviewRow,
} from '../../utils/textbookFilePreview'

interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  highlightedCodes?: string[]
  emptyDescription?: string
  onRowClick?: (code: string) => void
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  highlightedCodes,
  emptyDescription = '选择文件后在此处预览',
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
    if (!highlightedCodes || highlightedCodes.length === 0 || !tableRef.current) {
      return
    }
    const element = tableRef.current.querySelector(
      `[data-row-key="framework-row-${highlightedCodes[0]}"]`
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedCodes, rows])

  if (rows.length === 0) {
    return <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
          if (code && highlightedCodes?.includes(code)) {
            classes.push('framework-row-highlighted')
          }
          return classes.join(' ')
        }}
      />
    </div>
  )
}

export default FrameworkPreview
