import React from 'react'
import { Layout, Menu, Button, Space, Typography, Avatar, App, Select, Spin } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  ReadOutlined,
  BulbOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTextbook } from '../../hooks/useTextbook'

const { Header, Content } = Layout
const { Text } = Typography

interface AppLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/teacher/textbooks', label: '教材管理', icon: <BookOutlined /> },
  { key: 'learning', label: '学习', icon: <ReadOutlined /> },
  { key: '/smart-learning', label: '智能学习', icon: <BulbOutlined /> },
  { key: '/analytics/student', label: '分析', icon: <BarChartOutlined /> },
]

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const {
    selectedTextbookIds,
    textbooks,
    isLoading: textbooksLoading,
    selectMultiple,
  } = useTextbook()

  const handleMenuClick = ({ key }: { key: string }): void => {
    if (key === 'learning') {
      if (selectedTextbookIds.length > 0) {
        void navigate(`/learning/${selectedTextbookIds[0]}`)
      } else if (textbooks.length > 0) {
        void navigate(`/learning/${textbooks[0].id}`)
      } else {
        message.warning('暂无教材，请先导入教材')
      }
      return
    }
    void navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1890ff',
              cursor: 'pointer',
            }}
            onClick={(): void => {
              void navigate('/')
            }}
          >
            知识通
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderBottom: 'none', minWidth: 400 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isAuthenticated && (
            <Select
              mode="multiple"
              maxTagCount={2}
              style={{ minWidth: 180, maxWidth: 280 }}
              placeholder={textbooksLoading ? <Spin size="small" /> : '选择教材'}
              loading={textbooksLoading}
              disabled={textbooksLoading || textbooks.length === 0}
              value={selectedTextbookIds}
              onChange={(values: string[]) => selectMultiple(values)}
              options={textbooks.map(t => ({ label: t.name, value: t.id }))}
            />
          )}
          {isAuthenticated && user ? (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{user.name || user.email}</Text>
              <Button
                type="link"
                icon={<LogoutOutlined />}
                onClick={(): void => {
                  logout()
                  void navigate('/login')
                }}
              >
                退出
              </Button>
            </Space>
          ) : (
            <Space>
              <Button
                type="link"
                icon={<LoginOutlined />}
                onClick={(): void => {
                  void navigate('/login')
                }}
              >
                登录
              </Button>
              <Button
                type="primary"
                onClick={(): void => {
                  void navigate('/register')
                }}
              >
                注册
              </Button>
            </Space>
          )}
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f2f5' }}>{children}</Content>
    </Layout>
  )
}

export default AppLayout
