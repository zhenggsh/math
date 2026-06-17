import React, { useCallback, useMemo } from 'react'
import { Tabs, Skeleton, Collapse, Tag, Empty, Button, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { RecommendationMode, UnifiedRecommendationItem } from '../../hooks/useRecommendations'
import { StudyGoalTracker } from './StudyGoalTracker'
import styles from './SmartLearningNav.module.css'

export interface SmartLearningNavProps {
  mode: RecommendationMode
  onModeChange: (mode: RecommendationMode) => void
  items: UnifiedRecommendationItem[]
  selectedId?: string
  onSelectItem: (item: UnifiedRecommendationItem) => void
  isLoading: boolean
  onRefresh: () => void
  selectedTextbookIds?: string[]
  studiedCount?: number
  goalCount?: number
  onGoalChange?: (count: number) => void
}

interface Level2Group {
  level2: string
  items: UnifiedRecommendationItem[]
}

interface Level1Group {
  level1: string
  level2Groups: Level2Group[]
}

const MASTERY_CONFIG: Record<string, { color: string; label: string }> = {
  E: { color: '#ff4d4f', label: '需复习' },
  D: { color: '#faad14', label: '未掌握' },
  C: { color: '#1890ff', label: '基本掌握' },
  B: { color: '#52c41a', label: '良好' },
  A: { color: '#52c41a', label: '精通' },
}

const TAB_ITEMS = [
  { key: 'weak' as RecommendationMode, label: '薄弱点' },
  { key: 'importance' as RecommendationMode, label: '重要性' },
  { key: 'random' as RecommendationMode, label: '随机' },
]

function getLevel2Key(item: UnifiedRecommendationItem): string {
  return item.level2 ?? ''
}

function groupByLevel1ThenLevel2(items: UnifiedRecommendationItem[]): Level1Group[] {
  const level1Map = new Map<string, Map<string, UnifiedRecommendationItem[]>>()

  for (const item of items) {
    const l1 = item.level1
    const l2 = getLevel2Key(item)

    if (!level1Map.has(l1)) {
      level1Map.set(l1, new Map())
    }

    const level2Map = level1Map.get(l1)!
    if (!level2Map.has(l2)) {
      level2Map.set(l2, [])
    }

    level2Map.get(l2)!.push(item)
  }

  const result: Level1Group[] = []
  for (const [level1, level2Map] of level1Map) {
    const level2Groups: Level2Group[] = []
    for (const [level2, groupItems] of level2Map) {
      level2Groups.push({ level2, items: groupItems })
    }
    result.push({ level1, level2Groups })
  }

  return result
}

function renderMasteryTag(masteryLevel?: string): React.ReactNode {
  if (!masteryLevel) return null
  const config = MASTERY_CONFIG[masteryLevel]
  if (!config) return null
  return (
    <Tag color={config.color} key="mastery">
      {masteryLevel} {config.label}
    </Tag>
  )
}

function renderTrendTag(item: UnifiedRecommendationItem, showTrend: boolean): React.ReactNode {
  if (!showTrend) return null

  if (item.improvementVelocity === undefined || item.improvementVelocity === null) {
    return <Tag key="trend">— 暂无趋势</Tag>
  }

  if (item.improvementVelocity > 0) {
    return (
      <Tag color="green" key="trend">
        ↗ 上升
      </Tag>
    )
  }

  if (item.improvementVelocity < 0) {
    return (
      <Tag color="red" key="trend">
        ↘ 下降
      </Tag>
    )
  }

  return <Tag key="trend">→ 持平</Tag>
}

function renderIsMasteredTag(isMastered?: boolean): React.ReactNode {
  if (isMastered === undefined) return null
  return (
    <Tag color={isMastered ? 'green' : 'orange'} key="mastered">
      {isMastered ? '已掌握' : '未掌握'}
    </Tag>
  )
}

function renderDaysSinceLastStudy(days?: number): React.ReactNode {
  if (days === undefined || days === null) return null
  return <Tag key="days">{days} 天前</Tag>
}

const RecommendationItem: React.FC<{
  item: UnifiedRecommendationItem
  isSelected: boolean
  showTrend: boolean
  onClick: (item: UnifiedRecommendationItem) => void
}> = ({ item, isSelected, showTrend, onClick }) => {
  return (
    <div
      className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      data-testid="recommendation-item"
      data-selected={isSelected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(item)
        }
      }}
    >
      <div className={styles.itemHeader}>
        <span className={styles.itemCode}>{item.code}</span>
        <span className={styles.itemName}>{item.name}</span>
      </div>
      <div className={styles.itemTags}>
        {renderMasteryTag(item.masteryLevel)}
        {showTrend ? renderTrendTag(item, showTrend) : renderIsMasteredTag(item.isMastered)}
        {renderDaysSinceLastStudy(item.daysSinceLastStudy)}
      </div>
      {item.recommendationReason && (
        <div className={styles.itemReason}>{item.recommendationReason}</div>
      )}
    </div>
  )
}

export const SmartLearningNav: React.FC<SmartLearningNavProps> = ({
  mode,
  onModeChange,
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onRefresh,
  selectedTextbookIds,
  studiedCount,
  goalCount,
  onGoalChange,
}) => {
  const groupedItems = useMemo(() => {
    if (mode !== 'weak') return []
    return groupByLevel1ThenLevel2(items)
  }, [mode, items])

  const handleSelectItem = useCallback(
    (item: UnifiedRecommendationItem) => {
      onSelectItem(item)
    },
    [onSelectItem]
  )

  const defaultActiveKeys = useMemo(() => {
    return groupedItems.slice(0, 2).map((_, index) => String(index))
  }, [groupedItems])

  const hasTextbookSelection = (selectedTextbookIds ?? []).length > 0
  const isTextbookEmpty = !isLoading && !hasTextbookSelection
  const isWeakModeEmpty =
    mode === 'weak' && !isLoading && hasTextbookSelection && items.length === 0
  const isOtherModeEmpty =
    mode !== 'weak' && !isLoading && hasTextbookSelection && items.length === 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs
          activeKey={mode}
          onChange={key => onModeChange(key as RecommendationMode)}
          items={TAB_ITEMS.map(tab => ({ key: tab.key, label: tab.label }))}
          size="small"
          className={styles.tabs}
        />
        <Tooltip title="刷新">
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={onRefresh}
            className={styles.refreshButton}
            aria-label="刷新"
          />
        </Tooltip>
      </div>

      {mode === 'weak' && onGoalChange !== undefined && hasTextbookSelection && (
        <div className={styles.goalTracker}>
          <StudyGoalTracker
            studiedCount={studiedCount ?? 0}
            goalCount={goalCount ?? 5}
            onGoalChange={onGoalChange}
          />
        </div>
      )}

      <div className={styles.listArea}>
        {isLoading && (
          <div className={styles.loading}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        )}

        {isTextbookEmpty && (
          <Empty description="请先选择教材" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        {isWeakModeEmpty && (
          <Empty description="恭喜！暂无薄弱知识点" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => onModeChange('random')}>
              切换到随机模式
            </Button>
          </Empty>
        )}

        {isOtherModeEmpty && <Empty description="暂无推荐" image={Empty.PRESENTED_IMAGE_SIMPLE} />}

        {!isLoading && mode === 'weak' && items.length > 0 && (
          <Collapse
            defaultActiveKey={defaultActiveKeys}
            className={styles.collapse}
            items={groupedItems.map((l1Group, l1Index) => ({
              key: String(l1Index),
              label: `${l1Group.level1} (${l1Group.level2Groups.reduce(
                (sum, g) => sum + g.items.length,
                0
              )})`,
              children: (
                <div className={styles.level2Groups}>
                  {l1Group.level2Groups.map((l2Group, l2Index) => (
                    <div key={l2Index} className={styles.level2Group}>
                      {l2Group.level2 && (
                        <div className={styles.level2Header}>{l2Group.level2}</div>
                      )}
                      {l2Group.items.map(item => (
                        <RecommendationItem
                          key={item.id}
                          item={item}
                          isSelected={selectedId === item.id}
                          showTrend={true}
                          onClick={handleSelectItem}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        )}

        {!isLoading && mode !== 'weak' && items.length > 0 && (
          <div className={styles.flatList}>
            {items.map(item => (
              <RecommendationItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                showTrend={false}
                onClick={handleSelectItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SmartLearningNav
