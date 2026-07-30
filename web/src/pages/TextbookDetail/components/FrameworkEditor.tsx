import React from 'react'
import { Table, Button, Space, Typography, Checkbox, Tooltip, type TableProps } from 'antd'
import { DeleteOutlined, PlusOutlined, PlusCircleOutlined } from '@ant-design/icons'
import type { EditorRow } from '../../../utils/knowledgeBlocks'
import { getRecordCode } from '../../../utils/textbookFilePreview'

interface FrameworkEditorProps {
  rows: EditorRow[]
  selectedRowIds: string[]
  onRowChange: (rowId: string, patch: Partial<Omit<EditorRow, 'rowId'>>) => void
  onSelectionChange: (rowId: string) => void
  onAddRow: () => void
  onDeleteRow: (rowId: string) => void
  onInsertAfter: (rowId: string) => void
  mdSyncWarnings: Map<string, string>
}

const CODE_PATTERN = /^\d+(\.\d+)*$/

function cellChangeToPatch(key: string, value: string): Partial<Omit<EditorRow, 'rowId'>> {
  return { [key]: value } as Partial<Omit<EditorRow, 'rowId'>>
}

export const FrameworkEditor: React.FC<FrameworkEditorProps> = ({
  rows,
  selectedRowIds,
  onRowChange,
  onSelectionChange,
  onAddRow,
  onDeleteRow,
  onInsertAfter,
  mdSyncWarnings,
}) => {
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; key: string } | null>(null)
  const [editValue, setEditValue] = React.useState('')
  const escapePressedRef = React.useRef(false)
  const committedRef = React.useRef(false)
  const inputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map())

  React.useEffect(() => {
    if (!editingCell) return
    const input = inputRefs.current.get(`${editingCell.rowId}-${editingCell.key}`)
    input?.select()
  }, [editingCell])

  const validateRow = (row: EditorRow): string | null => {
    const code = getRecordCode(row)
    if (!code) {
      return '编号不能为空'
    }
    if (!CODE_PATTERN.test(code)) {
      return '编号必须是数字层级格式'
    }
    const hasDuplicate = rows.some(r => r.rowId !== row.rowId && getRecordCode(r) === code)
    if (hasDuplicate) {
      return '编号重复'
    }
    return null
  }

  const renderSyncStatus = (record: EditorRow): React.ReactNode => {
    const warning = mdSyncWarnings.get(record.rowId)
    if (warning) {
      return <Typography.Text type="warning">{warning}</Typography.Text>
    }
    const error = validateRow(record)
    if (error) {
      return <Typography.Text type="danger">{error}</Typography.Text>
    }
    return <Typography.Text type="success">正常</Typography.Text>
  }

  const columns: TableProps<EditorRow>['columns'] = [
    {
      title: '选择',
      key: 'select',
      width: 60,
      render: (_value: unknown, record: EditorRow) => (
        <Checkbox
          checked={selectedRowIds.includes(record.rowId)}
          onChange={() => onSelectionChange(record.rowId)}
        />
      ),
    },
    ...Object.keys(rows[0] ?? {})
      .filter(key => key !== 'rowId')
      .map(key => ({
        title: key,
        dataIndex: key,
        key,
        render: (value: unknown, record: EditorRow) => {
          const cellValue = (value as string | undefined) ?? ''
          const isEditing = editingCell?.rowId === record.rowId && editingCell?.key === key
          const inputRefKey = `${record.rowId}-${key}`
          return (
            <input
              ref={el => {
                if (el) {
                  inputRefs.current.set(inputRefKey, el)
                }
              }}
              value={isEditing ? editValue : cellValue}
              onFocus={() => {
                setEditingCell({ rowId: record.rowId, key })
                setEditValue(cellValue)
              }}
              onChange={e => setEditValue(e.currentTarget.value)}
              onBlur={() => {
                if (escapePressedRef.current) {
                  escapePressedRef.current = false
                  setEditingCell(null)
                  return
                }
                if (committedRef.current) {
                  committedRef.current = false
                  setEditingCell(null)
                  return
                }
                if (isEditing && editValue !== cellValue) {
                  onRowChange(record.rowId, cellChangeToPatch(key, editValue))
                }
                setEditingCell(null)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  committedRef.current = true
                  if (isEditing && editValue !== cellValue) {
                    onRowChange(record.rowId, cellChangeToPatch(key, editValue))
                  }
                  setEditingCell(null)
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  escapePressedRef.current = true
                  setEditValue(cellValue)
                  e.currentTarget.blur()
                }
              }}
              style={{ width: '100%' }}
              data-testid={`cell-input-${record.rowId}-${key}`}
            />
          )
        },
      })),
    {
      title: '同步状态',
      key: 'sync',
      width: 120,
      render: (_value: unknown, record: EditorRow) => renderSyncStatus(record),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_value: unknown, record: EditorRow) => (
        <Space size="small">
          <Tooltip title="下方插入一行">
            <Button
              type="text"
              size="small"
              icon={<PlusCircleOutlined />}
              aria-label="下方插入一行"
              onClick={() => onInsertAfter(record.rowId)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="删除"
              onClick={() => onDeleteRow(record.rowId)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="dashed" icon={<PlusOutlined />} onClick={onAddRow}>
          新增行
        </Button>
      </div>
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="rowId"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}

export default FrameworkEditor
