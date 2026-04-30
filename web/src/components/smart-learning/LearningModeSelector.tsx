import React from 'react';
import { Card, Statistic, Badge, Space } from 'antd';
import {
  WarningOutlined,
  StarOutlined,
  ShakeOutlined,
} from '@ant-design/icons';
import styles from './LearningModeSelector.module.css';

export type LearningMode = 'weak' | 'importance' | 'random';

export interface LearningModeSelectorProps {
  /** 当前选中的模式 */
  activeMode: LearningMode;
  /** 模式切换回调 */
  onModeChange: (mode: LearningMode) => void;
  /** 统计数据 */
  stats: {
    weakPointCount: number;
    importanceStats: { A: number; B: number; C: number };
  };
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 学习模式选择器组件
 * 提供薄弱点、重要性分级、随机三种学习模式的选择
 */
export const LearningModeSelector: React.FC<LearningModeSelectorProps> = ({
  activeMode,
  onModeChange,
  stats,
  loading = false,
}) => {
  const modes: Array<{
    key: LearningMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      key: 'weak',
      title: 'Weak Points',
      description: 'Focus on knowledge points with low mastery level (C/D/E)',
      icon: <WarningOutlined />,
      color: '#ff4d4f',
    },
    {
      key: 'importance',
      title: 'By Importance',
      description: 'Learn by priority: Must-know (A) → Important (B) → Supplementary (C)',
      icon: <StarOutlined />,
      color: '#faad14',
    },
    {
      key: 'random',
      title: 'Random',
      description: 'Discover knowledge randomly to broaden coverage',
      icon: <ShakeOutlined />,
      color: '#52c41a',
    },
  ];

  return (
    <div className={styles.selector}>
      <h3 className={styles.title}>Learning Mode</h3>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {modes.map((mode) => (
          <Card
            key={mode.key}
            className={`${styles.modeCard} ${activeMode === mode.key ? styles.active : ''}`}
            onClick={() => onModeChange(mode.key)}
            loading={loading}
            hoverable
          >
            <div className={styles.cardContent}>
              <div className={styles.iconWrapper} style={{ color: mode.color }}>
                {mode.icon}
              </div>
              <div className={styles.info}>
                <div className={styles.modeTitle}>
                  {mode.title}
                  {mode.key === 'weak' && stats.weakPointCount > 0 && (
                    <Badge
                      count={stats.weakPointCount}
                      style={{ backgroundColor: mode.color }}
                      className={styles.badge}
                    />
                  )}
                </div>
                <div className={styles.description}>{mode.description}</div>
              </div>
              {mode.key === 'importance' && (
                <div className={styles.stats}>
                  <Space size="small">
                    <Statistic
                      value={stats.importanceStats.A}
                      suffix="A"
                      valueStyle={{ fontSize: 12, color: '#ff4d4f' }}
                    />
                    <Statistic
                      value={stats.importanceStats.B}
                      suffix="B"
                      valueStyle={{ fontSize: 12, color: '#faad14' }}
                    />
                    <Statistic
                      value={stats.importanceStats.C}
                      suffix="C"
                      valueStyle={{ fontSize: 12, color: '#8c8c8c' }}
                    />
                  </Space>
                </div>
              )}
            </div>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default LearningModeSelector;
