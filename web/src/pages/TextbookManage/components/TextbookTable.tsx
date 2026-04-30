import React from 'react'
import { Table, Button, Space, Tag, Popconfirm, Tooltip } from 'antd'
import {
  SyncOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Textbook } from '../../../types/textbook.types'

interface TextbookTableProps {
  textbooks: Textbook[]
  loading: boolean
  onRefresh: (id: string) => void
  onDelete: (id: string) => void
}

export const TextbookTable: React.FC<TextbookTableProps> = ({
  textbooks,
  loading,
  onRefresh,
  onDelete,
}) => {
  const columns: ColumnsType<Textbook> = [
    {
      title: '教材名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Textbook) => (
        <Space>
          {record.frameworkType === 'xlsx' ? (
            <FileExcelOutlined style={{ color: '#52c41a' }} />
          ) : (
            <FileTextOutlined style={{ color: '#1890ff' }} />
          )}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: '框架类型',
      dataIndex: 'frameworkType',
      key: 'frameworkType',
      render: (type: string) => (
        <Tag color={type === 'xlsx' ? 'green' : 'blue'}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: '内容文件',
      dataIndex: 'hasContent',
      key: 'hasContent',
      render: (hasContent: boolean) =>
        hasContent ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            已上传
          </Tag>
        ) : (
          <Tag color="default">未上传</Tag>
        ),
    },
    {
      title: '知识点数量',
      dataIndex: 'knowledgePointCount',
      key: 'knowledgePointCount',
      align: 'center',
    },
    {
      title: '最后修改',
      dataIndex: 'lastModifiedAt',
      key: 'lastModifiedAt',
      render: (date: string) => {
        const d = new Date(date)
        return d.toLocaleString('zh-CN')
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="刷新教材">
            <Button type="text" icon={<SyncOutlined />} onClick={() => onRefresh(record.id)} />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除教材 "${record.name}" 吗？此操作不可恢复。`}
            onConfirm={() => onDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除教材">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={textbooks}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条记录`,
      }}
      scroll={{ x: 800 }}
    />
  )
}
