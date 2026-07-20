import React, { useMemo } from 'react'
import { Table, Typography, Empty } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  onRowClick?: (code: string) => void
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  onRowClick,
}) => {
  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>()
    errors.forEach((err) => {
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
        ? Object.keys(rows[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            ellipsis: true,
          }))
        : []
    return [
      ...baseColumns,
      {
        title: '状态',
        key: 'status',
        width: 120,
        render: (_value: unknown, record: XlsxPreviewRow) => {
          const code = record.code
          const rowErrors = code ? errorMap.get(code) : undefined
          if (rowErrors && rowErrors.length > 0) {
            return (
              <Typography.Text type="danger">
                ✗ {rowErrors.map((e) => e.message).join('；')}
              </Typography.Text>
            )
          }
          return <Typography.Text type="success">✓</Typography.Text>
        },
      },
    ]
  }, [rows, errorMap])

  if (rows.length === 0) {
    return <Empty description="选择文件后在此处预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <Table
      dataSource={rows}
      columns={columns}
      rowKey={(record) => (record.code ? `framework-row-${record.code}` : JSON.stringify(record))}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }}
      onRow={(record) => ({
        onClick: () => {
          if (record.code && onRowClick) {
            onRowClick(record.code)
          }
        },
      })}
      rowClassName={(record) => {
        return record.code && errorMap.has(record.code) ? 'framework-row-error' : ''
      }}
    />
  )
}

export default FrameworkPreview
