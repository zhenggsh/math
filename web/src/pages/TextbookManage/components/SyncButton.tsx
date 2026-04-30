/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useState } from 'react'
import { Button, Modal, Space, Typography, List, Tag, message } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import type { SyncResult } from '../../../types/textbook.types'

interface SyncButtonProps {
  onSync: () => Promise<SyncResult | null>
  loading: boolean
}

interface SyncModalState {
  open: boolean
  result: SyncResult | null
}

export const SyncButton: React.FC<SyncButtonProps> = ({ onSync, loading }) => {
  const [modalState, setModalState] = useState<SyncModalState>({
    open: false,
    result: null,
  })
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await onSync()
      if (result) {
        setModalState({ open: true, result })
        const totalChanges = result.added.length + result.updated.length + result.removed.length
        if (totalChanges > 0) {
          message.success(
            `同步完成：新增 ${result.added.length} 个，更新 ${result.updated.length} 个，删除 ${result.removed.length} 个`
          )
        } else {
          message.info('所有教材已是最新状态')
        }
      }
    } catch (err) {
      console.error('Sync failed:', err)
      message.error('同步失败，请稍后重试')
    } finally {
      setSyncing(false)
    }
  }

  const handleClose = () => {
    setModalState({ open: false, result: null })
  }

  const { result } = modalState
  const hasChanges =
    result && (result.added.length > 0 || result.updated.length > 0 || result.removed.length > 0)

  return (
    <>
      <Button
        type="primary"
        icon={<SyncOutlined spin={syncing || loading} />}
        onClick={handleSync}
        loading={syncing || loading}
      >
        同步所有教材
      </Button>

      <Modal
        title="同步结果"
        open={modalState.open}
        onOk={handleClose}
        onCancel={handleClose}
        footer={[
          <Button key="ok" type="primary" onClick={handleClose}>
            确定
          </Button>,
        ]}
        width={600}
      >
        {result && (
          <Space direction="vertical" style={{ width: '100%' }}>
            {!hasChanges ? (
              <Typography.Text type="secondary">所有教材已是最新状态，没有变化。</Typography.Text>
            ) : (
              <>
                {result.added.length > 0 && (
                  <div>
                    <Tag color="success">新增 ({result.added.length})</Tag>
                    <List
                      size="small"
                      bordered
                      dataSource={result.added}
                      renderItem={item => (
                        <List.Item>
                          <Typography.Text>{item}</Typography.Text>
                        </List.Item>
                      )}
                      style={{ marginTop: 8, maxHeight: 150, overflow: 'auto' }}
                    />
                  </div>
                )}

                {result.updated.length > 0 && (
                  <div>
                    <Tag color="warning">更新 ({result.updated.length})</Tag>
                    <List
                      size="small"
                      bordered
                      dataSource={result.updated}
                      renderItem={item => (
                        <List.Item>
                          <Typography.Text>{item}</Typography.Text>
                        </List.Item>
                      )}
                      style={{ marginTop: 8, maxHeight: 150, overflow: 'auto' }}
                    />
                  </div>
                )}

                {result.removed.length > 0 && (
                  <div>
                    <Tag color="error">删除 ({result.removed.length})</Tag>
                    <List
                      size="small"
                      bordered
                      dataSource={result.removed}
                      renderItem={item => (
                        <List.Item>
                          <Typography.Text>{item}</Typography.Text>
                        </List.Item>
                      )}
                      style={{ marginTop: 8, maxHeight: 150, overflow: 'auto' }}
                    />
                  </div>
                )}
              </>
            )}
          </Space>
        )}
      </Modal>
    </>
  )
}
