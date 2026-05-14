import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Input, Form, App, Modal, Typography } from 'antd'
import { SaveOutlined, HistoryOutlined } from '@ant-design/icons'
import { MasteryRating } from './MasteryRating'
import { LearningTimer } from './LearningTimer'
import { RecordHistory } from './RecordHistory'
import type { LearningRecord, MasteryLevel } from '../../types/learning-record.types'
import {
  createLearningRecord,
  getLearningRecordsByKnowledgePoint,
} from '../../services/learningRecordApi'
import styles from './FeedbackPanel.module.css'

const { Title } = Typography
const { TextArea } = Input

/**
 * FeedbackPanel 组件 Props
 */
export interface FeedbackPanelProps {
  /** 知识点ID */
  knowledgePointId: string
  /** 提交成功回调 */
  onSubmitSuccess?: () => void
}

/**
 * 学习反馈面板组件
 * 上下两栏紧凑布局：上栏为学习反馈，下栏为功能区
 */
export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  knowledgePointId,
  onSubmitSuccess,
}) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [startTime] = useState<Date>(new Date())
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [textAreaRows, setTextAreaRows] = useState(2)
  const timerRef = useRef<{ getCurrentMinutes: () => number }>(null)
  const textareaContainerRef = useRef<HTMLDivElement>(null)

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLearningRecordsByKnowledgePoint(knowledgePointId)
      setRecords(data)
    } catch (error) {
      console.error('Failed to load learning records:', error)
    } finally {
      setLoading(false)
    }
  }, [knowledgePointId])

  // 初始加载历史记录
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // 处理表单提交
  const handleSubmit = async (values: { masteryLevel: MasteryLevel; notes?: string }) => {
    if (!values.masteryLevel) {
      message.error('请选择掌握程度')
      return
    }

    try {
      setSubmitting(true)

      const minutes =
        timerRef.current?.getCurrentMinutes() || Math.max(1, Math.ceil(durationMinutes))

      await createLearningRecord({
        knowledgePointId,
        masteryLevel: values.masteryLevel,
        durationMinutes: minutes,
        startTime: startTime.toISOString(),
        notes: values.notes,
      })

      message.success('学习记录已保存')
      form.resetFields()

      await loadHistory()
      onSubmitSuccess?.()
    } catch (error) {
      console.error('Failed to create learning record:', error)
      message.error('保存学习记录失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 处理时长变化
  const handleDurationChange = (minutes: number) => {
    setDurationMinutes(minutes)
  }

  // 监听文本框容器高度，动态调整 rows
  useEffect(() => {
    const container = textareaContainerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const containerHeight = entry.contentRect.height
        // 减去标题行(~28) + 掌握程度行(~32) + gaps(~12)
        const availableHeight = containerHeight - 28 - 32 - 12
        const rowHeight = 22
        const rows = Math.max(2, Math.min(10, Math.floor(availableHeight / rowHeight)))
        setTextAreaRows(rows)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={styles.feedbackPanel}>
      <Form
        form={form}
        layout="vertical"
        onFinish={values =>
          void handleSubmit(values as { masteryLevel: MasteryLevel; notes?: string })
        }
        className={styles.feedbackForm}
      >
        {/* 上栏 — 学习反馈 */}
        <div className={styles.upperSection}>
          <div className={styles.ratingRow}>
            <Title level={5} className={styles.sectionTitle}>
              学习反馈
            </Title>
            <Form.Item
              name="masteryLevel"
              rules={[{ required: true, message: '请选择掌握程度' }]}
              className={styles.masteryItem}
            >
              <MasteryRating size="small" />
            </Form.Item>
          </div>

          <div ref={textareaContainerRef} className={styles.textareaContainer}>
            <Form.Item name="notes" className={styles.notesItem}>
              <TextArea
                placeholder="记录今天的学习心得、疑问或需要注意的地方..."
                maxLength={500}
                showCount
                rows={textAreaRows}
              />
            </Form.Item>
          </div>
        </div>

        {/* 下栏 — 功能区 */}
        <div className={styles.lowerSection}>
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryModalOpen(true)} size="small">
            学习历史
          </Button>

          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            size="small"
          >
            提交
          </Button>

          <LearningTimer startTime={startTime} onDurationChange={handleDurationChange} />
        </div>
      </Form>

      {/* 学习历史 Modal */}
      <Modal
        title="学习历史"
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
        width={600}
      >
        <RecordHistory records={records} loading={loading} />
      </Modal>
    </div>
  )
}

export default FeedbackPanel
