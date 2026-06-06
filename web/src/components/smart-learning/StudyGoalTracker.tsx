import React, { useState } from 'react'
import { Progress, Button, Modal, InputNumber } from 'antd'
import { SettingOutlined, CheckCircleOutlined } from '@ant-design/icons'
import styles from './StudyGoalTracker.module.css'

export interface StudyGoalTrackerProps {
  studiedCount: number
  goalCount: number
  onGoalChange: (goal: number) => void
}

export const StudyGoalTracker: React.FC<StudyGoalTrackerProps> = ({
  studiedCount,
  goalCount,
  onGoalChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState<number | null>(goalCount)

  const percent =
    goalCount > 0
      ? Math.min(100, Math.round((studiedCount / goalCount) * 100))
      : 0

  const isCompleted = goalCount > 0 && studiedCount >= goalCount

  const handleOpen = (): void => {
    setInputValue(goalCount)
    setIsModalOpen(true)
  }

  const handleOk = (): void => {
    if (inputValue !== null && inputValue >= 1 && inputValue <= 20) {
      onGoalChange(inputValue)
    }
    setIsModalOpen(false)
  }

  const handleCancel = (): void => {
    setIsModalOpen(false)
  }

  return (
    <div className={styles.tracker}>
      <div className={styles.content}>
        {isCompleted ? (
          <div className={styles.completed}>
            <CheckCircleOutlined className={styles.completedIcon} />
            <span className={styles.completedText}>今日目标达成！继续保持</span>
          </div>
        ) : goalCount > 0 ? (
          <div className={styles.progressArea}>
            <span className={styles.progressText}>
              今日已复习 {studiedCount} / {goalCount} 个薄弱点
            </span>
            <Progress percent={percent} size="small" />
          </div>
        ) : (
          <span className={styles.countText}>
            今日已复习 {studiedCount} 个薄弱点
          </span>
        )}
      </div>

      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        onClick={handleOpen}
        aria-label="设定学习目标"
      />

      <Modal
        title="设定今日学习目标"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
      >
        <div className={styles.modalContent}>
          <span className={styles.modalLabel}>每日复习目标数量（1-20）：</span>
          <InputNumber
            min={1}
            max={20}
            defaultValue={goalCount}
            value={inputValue}
            onChange={value => setInputValue(value)}
            style={{ width: 80 }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default StudyGoalTracker
