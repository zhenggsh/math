import React, { useState } from 'react'
import { Button, Tooltip, Empty, Card, Typography, Space } from 'antd'
import {
  RobotOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  EditOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import styles from './AISidebar.module.css'

const { Title, Text } = Typography

/**
 * AI 侧栏 Props
 */
export interface AISidebarProps {
  /** 是否折叠 */
  collapsed?: boolean
  /** 折叠状态变化回调 */
  onCollapseChange?: (collapsed: boolean) => void
  /** 当前知识点 ID */
  knowledgePointId?: string
  /** 当前知识点标题 */
  knowledgePointTitle?: string
}

/**
 * AI 功能菜单项
 */
interface AIMenuItem {
  key: string
  icon: React.ReactNode
  label: string
  description: string
}

const aiMenuItems: AIMenuItem[] = [
  {
    key: 'explain',
    icon: <BookOutlined />,
    label: 'Explain',
    description: 'Explain this concept in detail',
  },
  {
    key: 'quiz',
    icon: <QuestionCircleOutlined />,
    label: 'Quiz',
    description: 'Generate practice questions',
  },
  {
    key: 'summarize',
    icon: <EditOutlined />,
    label: 'Summarize',
    description: 'Summarize key points',
  },
]

/**
 * AI 侧栏组件
 * 当前为占位实现，预留 AI 功能接口
 */
export const AISidebar: React.FC<AISidebarProps> = ({
  collapsed: controlledCollapsed,
  onCollapseChange,
  knowledgePointId,
  knowledgePointTitle,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed

  // 处理折叠/展开
  const handleToggle = () => {
    const newCollapsed = !collapsed
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newCollapsed)
    }
    onCollapseChange?.(newCollapsed)
  }

  // 处理功能点击
  const handleFeatureClick = (key: string) => {
    // TODO: 实现 AI 功能
    console.log(`AI feature clicked: ${key}, knowledgePoint: ${knowledgePointId}`)
  }

  if (collapsed) {
    return (
      <div className={styles.sidebarCollapsed}>
        <Tooltip title="AI Assistant" placement="left">
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleToggle}
            className={styles.expandButton}
          />
        </Tooltip>
      </div>
    )
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <Space>
          <RobotOutlined className={styles.robotIcon} />
          <Title level={5} className={styles.title}>
            AI Assistant
          </Title>
        </Space>
        <Button
          type="text"
          icon={<MenuFoldOutlined />}
          onClick={handleToggle}
          className={styles.collapseButton}
        />
      </div>

      <div className={styles.content}>
        {knowledgePointTitle ? (
          <Card className={styles.contextCard} size="small">
            <Text type="secondary">Current Topic</Text>
            <div className={styles.contextTitle}>{knowledgePointTitle}</div>
          </Card>
        ) : null}

        <div className={styles.menu}>
          {aiMenuItems.map(item => (
            <Card
              key={item.key}
              className={styles.menuItem}
              hoverable
              onClick={() => handleFeatureClick(item.key)}
              size="small"
            >
              <Space>
                {item.icon}
                <div>
                  <div className={styles.menuItemLabel}>{item.label}</div>
                  <Text type="secondary" className={styles.menuItemDesc}>
                    {item.description}
                  </Text>
                </div>
              </Space>
            </Card>
          ))}
        </div>

        <div className={styles.placeholder}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">AI features coming soon</Text>}
          />
        </div>
      </div>
    </div>
  )
}

export default AISidebar
