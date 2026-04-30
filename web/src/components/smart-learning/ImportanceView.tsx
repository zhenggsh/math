import React, { useState } from 'react';
import { Tabs, List, Tag, Empty, Switch, Spin, Card } from 'antd';
import { useByImportance } from '../../hooks/useSmartLearning';
import type { ByImportanceItem } from '../../services/smartLearningApi';
import styles from './ImportanceView.module.css';

export interface ImportanceViewProps {
  onSelectPoint?: (point: ByImportanceItem) => void;
}

const LEVEL_COLORS = {
  A: { color: '#ff4d4f', label: 'Must Know', desc: 'Core knowledge points' },
  B: { color: '#faad14', label: 'Important', desc: 'Important but not core' },
  C: { color: '#8c8c8c', label: 'Supplementary', desc: 'Additional knowledge' },
};

export const ImportanceView: React.FC<ImportanceViewProps> = ({ onSelectPoint }) => {
  const [activeLevel, setActiveLevel] = useState<'A' | 'B' | 'C'>('A');
  const [excludeMastered, setExcludeMastered] = useState(true);

  const { data, isLoading } = useByImportance({
    level: activeLevel,
    excludeMastered,
    limit: 50,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <Empty
          description={
            excludeMastered
              ? 'No unmastered points at this level. Great job!'
              : 'No points found at this level.'
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <List
        className={styles.list}
        dataSource={data.items}
        renderItem={(item) => (
          <List.Item
            className={styles.listItem}
            onClick={() => onSelectPoint?.(item)}
            actions={[
              item.isMastered ? (
                <Tag color="success" key="mastered">Mastered</Tag>
              ) : (
                <Tag color="processing" key="learning">Learning</Tag>
              ),
              <Tag color={LEVEL_COLORS[activeLevel].color} key="level">
                {activeLevel}
              </Tag>,
            ]}
          >
            <List.Item.Meta
              title={
                <span className={styles.title}>
                  {item.level1}
                  {item.level2 && ` > ${item.level2}`}
                  {item.level3 && ` > ${item.level3}`}
                </span>
              }
              description={
                <div className={styles.description}>
                  <span className={styles.code}>{item.code}</span>
                  {item.definition && (
                    <span className={styles.def}>{item.definition}</span>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <Card className={styles.levelCard}>
          <div className={styles.levelInfo}>
            <span
              className={styles.levelBadge}
              style={{ backgroundColor: LEVEL_COLORS[activeLevel].color }}
            >
              {activeLevel}
            </span>
            <div>
              <div className={styles.levelLabel}>{LEVEL_COLORS[activeLevel].label}</div>
              <div className={styles.levelDesc}>{LEVEL_COLORS[activeLevel].desc}</div>
            </div>
          </div>
        </Card>
        <div className={styles.switch}>
          <span>Exclude Mastered</span>
          <Switch checked={excludeMastered} onChange={setExcludeMastered} />
        </div>
      </div>

      <Tabs
        activeKey={activeLevel}
        onChange={(key) => setActiveLevel(key as 'A' | 'B' | 'C')}
        className={styles.tabs}
        items={[
          {
            key: 'A',
            label: (
              <span className={styles.tabLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#ff4d4f' }} />
                Must Know {data?.total !== undefined && `(${data.total})`}
              </span>
            ),
            children: renderContent(),
          },
          {
            key: 'B',
            label: (
              <span className={styles.tabLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#faad14' }} />
                Important
              </span>
            ),
            children: renderContent(),
          },
          {
            key: 'C',
            label: (
              <span className={styles.tabLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#8c8c8c' }} />
                Supplementary
              </span>
            ),
            children: renderContent(),
          },
        ]}
      />
    </div>
  );
};

export default ImportanceView;
