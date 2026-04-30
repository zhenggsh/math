import React from 'react';
import { Radio, Space, Tooltip } from 'antd';
import type { MasteryLevel } from '../../types/learning-record.types';
import { MASTERY_LEVEL_CONFIG } from '../../types/learning-record.types';
import styles from './MasteryRating.module.css';

/**
 * MasteryRating 组件 Props
 */
export interface MasteryRatingProps {
  /** 当前选中的掌握程度 */
  value?: MasteryLevel;
  /** 选中值变化回调 */
  onChange?: (value: MasteryLevel) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 组件大小 */
  size?: 'small' | 'middle' | 'large';
}

/**
 * 掌握程度评分组件
 * 显示 A/B/C/D/E 五级评分选项，每个选项显示对应的颜色标识
 */
export const MasteryRating: React.FC<MasteryRatingProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'middle',
}) => {
  const levels: MasteryLevel[] = ['A', 'B', 'C', 'D', 'E'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value as MasteryLevel;
    onChange?.(newValue);
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.middle;
    }
  };

  return (
    <Radio.Group
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`${styles.masteryRating} ${getSizeClass()}`}
    >
      <Space>
        {levels.map((level) => {
          const config = MASTERY_LEVEL_CONFIG[level];
          return (
            <Tooltip key={level} title={`${config.label} - ${config.description}`}>
              <Radio.Button
                value={level}
                className={styles.ratingButton}
                style={{
                  '--rating-color': config.color,
                } as React.CSSProperties}
              >
                <span
                  className={styles.ratingDot}
                  style={{ backgroundColor: config.color }}
                />
                <span className={styles.ratingLabel}>{level}</span>
              </Radio.Button>
            </Tooltip>
          );
        })}
      </Space>
    </Radio.Group>
  );
};

export default MasteryRating;
