import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ClockCircleOutlined } from '@ant-design/icons'
import styles from './LearningTimer.module.css'

/**
 * LearningTimer 组件 Props
 */
export interface LearningTimerProps {
  /** 学习开始时间 */
  startTime: Date
  /** 时长变化回调（每分钟触发一次） */
  onDurationChange?: (minutes: number) => void
  /** 是否暂停计时 */
  paused?: boolean
}

/**
 * 格式化时间为 MM:SS
 */
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 学习计时器组件
 * 实时显示学习时长，格式为 MM:SS
 */
export const LearningTimer: React.FC<LearningTimerProps> = ({
  startTime,
  onDurationChange,
  paused = false,
}) => {
  // 计算已过去的时间
  const calculateElapsed = useCallback(() => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    return Math.max(0, diff)
  }, [startTime])

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => calculateElapsed())
  const lastReportedMinuteRef = useRef<number>(0)

  // 启动计时器
  useEffect(() => {
    if (paused) {
      return
    }

    const interval = setInterval(() => {
      const elapsed = calculateElapsed()
      setElapsedSeconds(elapsed)

      // 每分钟触发一次回调
      const minutes = Math.floor(elapsed / 60)
      if (minutes > lastReportedMinuteRef.current) {
        lastReportedMinuteRef.current = minutes
        onDurationChange?.(minutes)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [startTime, paused, calculateElapsed, onDurationChange])

  // 获取当前学习时长（分钟，用于提交时）
  const getCurrentMinutes = useCallback((): number => {
    return Math.ceil(elapsedSeconds / 60)
  }, [elapsedSeconds])

  // 暴露方法给父组件
  React.useImperativeHandle(
    React.useRef<{ getCurrentMinutes: () => number }>({
      getCurrentMinutes,
    }),
    () => ({ getCurrentMinutes })
  )

  return (
    <span className={styles.timerDisplay}>
      <ClockCircleOutlined className={styles.timerIcon} />
      <span className={styles.timerLabel}>学习时长</span>
      <span className={styles.timerValue}>{formatTime(elapsedSeconds)}</span>
    </span>
  )
}

export default LearningTimer
