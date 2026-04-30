import React, { useState } from 'react';
import { Card, Button, Radio, Empty, Spin, Badge, Row, Col } from 'antd';
import { ReloadOutlined, BookOutlined } from '@ant-design/icons';
import { useRandomPoints } from '../../hooks/useSmartLearning';
import type { KnowledgePoint } from '../../types/knowledge.types';
import styles from './RandomView.module.css';

export interface RandomViewProps {
  onSelectPoint?: (point: KnowledgePoint) => void;
}

const COUNT_OPTIONS = [5, 10, 20];

export const RandomView: React.FC<RandomViewProps> = ({ onSelectPoint }) => {
  const [count, setCount] = useState(10);
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, refetch, isFetching } = useRandomPoints({ count });

  const handleRefresh = async () => {
    setShouldFetch(true);
    await refetch();
  };

  const handleCountChange = (newCount: number) => {
    setCount(newCount);
    if (shouldFetch) {
      setTimeout(() => refetch(), 0);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.countSelector}>
          <span className={styles.label}>Number of points:</span>
          <Radio.Group value={count} onChange={(e) => handleCountChange(e.target.value)}>
            {COUNT_OPTIONS.map((option) => (
              <Radio.Button key={option} value={option}>
                {option}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined spin={isFetching} />}
          onClick={handleRefresh}
          loading={isLoading}
        >
          {shouldFetch ? 'Refresh' : 'Start Random'}
        </Button>
      </div>

      {!shouldFetch ? (
        <Empty
          description="Click 'Start Random' to discover new knowledge!"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className={styles.empty}
        />
      ) : isLoading ? (
        <div className={styles.loading}>
          <Spin size="large" tip="Picking random knowledge points..." />
        </div>
      ) : data && data.items.length > 0 ? (
        <Row gutter={[16, 16]} className={styles.grid}>
          {data.items.map((point, index) => (
            <Col xs={24} sm={12} lg={8} key={point.id}>
              <Card
                className={styles.card}
                hoverable
                onClick={() => onSelectPoint?.(point)}
                title={
                  <div className={styles.cardTitle}>
                    <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                    <span className={styles.code}>{point.code}</span>
                  </div>
                }
              >
                <div className={styles.cardContent}>
                  <div className={styles.path}>
                    {point.level1}
                    {point.level2 && ` > ${point.level2}`}
                    {point.level3 && ` > ${point.level3}`}
                  </div>
                  {point.definition && (
                    <div className={styles.definition}>{point.definition}</div>
                  )}
                  <div className={styles.footer}>
                    <span
                      className={styles.importance}
                      style={{
                        color:
                          point.importanceLevel === 'A'
                            ? '#ff4d4f'
                            : point.importanceLevel === 'B'
                            ? '#faad14'
                            : '#8c8c8c',
                      }}
                    >
                      {point.importanceLevel} Level
                    </span>
                    <BookOutlined className={styles.icon} />
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No points found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
};

export default RandomView;
