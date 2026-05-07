import React from 'react'
import { Card, Row, Col, Typography, Button, Space, App } from 'antd'
import { BookOutlined, ReadOutlined, BulbOutlined, BarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getTextbooks } from '../services/textbook.service'
import { Role } from '../types/auth.types'

const { Title, Paragraph } = Typography

const featureCards = [
  {
    title: '教材管理',
    description: '管理数学教材和知识点框架',
    icon: <BookOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    path: '/teacher/textbooks',
    role: Role.TEACHER,
  },
  {
    title: '知识学习',
    description: '浏览知识树，学习知识点内容',
    icon: <ReadOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    path: 'learning',
    role: null,
  },
  {
    title: '智能学习',
    description: '针对性学习薄弱知识点，随机练习',
    icon: <BulbOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    path: '/smart-learning',
    role: null,
  },
  {
    title: '学习分析',
    description: '查看学习统计和分析报告',
    icon: <BarChartOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    path: '/analytics/student',
    role: null,
  },
]

export const HomePage: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { user } = useAuth()

  const visibleCards = featureCards.filter(
    card => !card.role || user?.role === card.role || user?.role === Role.ADMIN
  )

  return (
    <div>
      <Card style={{ marginBottom: 24, textAlign: 'center', padding: '40px 0' }}>
        <Title level={2}>欢迎使用知识通学习系统！</Title>
        <Paragraph style={{ fontSize: 16, color: '#595959' }}>
          知识通是面向知识点查看学习系统，支持教材大纲展示、知识点学习、学习情况记录与分析。
        </Paragraph>
        {!user && (
          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              onClick={(): void => {
                void navigate('/login')
              }}
            >
              立即登录
            </Button>
            <Button
              size="large"
              onClick={(): void => {
                void navigate('/register')
              }}
            >
              注册账号
            </Button>
          </Space>
        )}
      </Card>

      <Row gutter={[24, 24]}>
        {visibleCards.map(card => (
          <Col key={card.path} xs={24} sm={12} lg={6}>
            <Card
              hoverable
              onClick={async (): Promise<void> => {
                if (card.path === 'learning') {
                  try {
                    const textbooks = await getTextbooks()
                    if (textbooks.length > 0) {
                      void navigate(`/learning/${textbooks[0].id}`)
                    } else {
                      message.warning('暂无教材，请先导入教材')
                    }
                  } catch {
                    message.error('获取教材列表失败')
                  }
                  return
                }
                void navigate(card.path)
              }}
              style={{ textAlign: 'center', height: '100%' }}
            >
              <div style={{ marginBottom: 16 }}>{card.icon}</div>
              <Title level={4}>{card.title}</Title>
              <Paragraph type="secondary">{card.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default HomePage
