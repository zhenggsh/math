import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Form,
  App,
  Divider,
  Typography,
} from 'antd';
import { SaveOutlined, HistoryOutlined } from '@ant-design/icons';
import { MasteryRating } from './MasteryRating';
import { LearningTimer } from './LearningTimer';
import { RecordHistory } from './RecordHistory';
import type {
  LearningRecord,
  MasteryLevel,
} from '../../types/learning-record.types';
import {
  createLearningRecord,
  getLearningRecordsByKnowledgePoint,
} from '../../services/learningRecordApi';
import styles from './FeedbackPanel.module.css';

const { Title } = Typography;
const { TextArea } = Input;

/**
 * FeedbackPanel 组件 Props
 */
export interface FeedbackPanelProps {
  /** 知识点ID */
  knowledgePointId: string;
  /** 提交成功回调 */
  onSubmitSuccess?: () => void;
}

/**
 * 学习反馈面板组件
 * 整合计时器、掌握程度评分、备注输入和历史记录展示
 */
export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  knowledgePointId,
  onSubmitSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [startTime] = useState<Date>(new Date());
  const [durationMinutes, setDurationMinutes] = useState(0);
  const timerRef = useRef<{ getCurrentMinutes: () => number }>(null);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLearningRecordsByKnowledgePoint(knowledgePointId);
      setRecords(data);
    } catch (error) {
      console.error('Failed to load learning records:', error);
      // 静默加载失败，不显示错误消息
    } finally {
      setLoading(false);
    }
  }, [knowledgePointId]);

  // 初始加载历史记录
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 处理表单提交
  const handleSubmit = async (values: {
    masteryLevel: MasteryLevel;
    notes?: string;
  }) => {
    if (!values.masteryLevel) {
      message.error('请选择掌握程度');
      return;
    }

    try {
      setSubmitting(true);

      // 获取当前学习时长（使用计时器计算的值或表单值）
      const minutes =
        timerRef.current?.getCurrentMinutes() ||
        Math.max(1, Math.ceil(durationMinutes));

      await createLearningRecord({
        knowledgePointId,
        masteryLevel: values.masteryLevel,
        durationMinutes: minutes,
        startTime: startTime.toISOString(),
        notes: values.notes,
      });

      message.success('学习记录已保存');
      form.resetFields();

      // 刷新历史记录
      await loadHistory();

      // 调用成功回调
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Failed to create learning record:', error);
      message.error('保存学习记录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 处理时长变化
  const handleDurationChange = (minutes: number) => {
    setDurationMinutes(minutes);
  };

  return (
    <div className={styles.feedbackPanel}>
      {/* 计时器 */}
      <div className={styles.timerSection}>
        <LearningTimer
          startTime={startTime}
          onDurationChange={handleDurationChange}
        />
      </div>

      {/* 反馈表单 */}
      <Card className={styles.formCard} size="small">
        <Title level={5} className={styles.sectionTitle}>
          <SaveOutlined /> 学习反馈
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={styles.feedbackForm}
        >
          <Form.Item
            name="masteryLevel"
            label="掌握程度"
            rules={[{ required: true, message: '请选择掌握程度' }]}
          >
            <MasteryRating />
          </Form.Item>

          <Form.Item name="notes" label="学习备注（可选）">
            <TextArea
              placeholder="记录今天的学习心得、疑问或需要注意的地方..."
              maxLength={500}
              showCount
              rows={3}
            />
          </Form.Item>

          <Form.Item className={styles.submitButtonWrapper}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              size="large"
              block
            >
              提交学习记录
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      {/* 历史记录 */}
      <div className={styles.historySection}>
        <Title level={5} className={styles.sectionTitle}>
          <HistoryOutlined /> 学习历史
        </Title>
        <RecordHistory records={records} loading={loading} />
      </div>
    </div>
  );
};

export default FeedbackPanel;
