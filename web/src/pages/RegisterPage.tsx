import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth.types'

const { Title } = Typography
const { Option } = Select

export const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const onFinish = async (values: {
    email: string
    password: string
    name: string
    role: Role
  }) => {
    setLoading(true)
    try {
      await register(values)
      message.success('注册成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, padding: '24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          数学通 - 注册
        </Title>
        <Form name="register" onFinish={onFinish} autoComplete="off" layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>

          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, message: '姓名长度至少为2位' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="姓名" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码长度至少为8位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>

          <Form.Item
            name="role"
            initialValue={Role.STUDENT}
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select size="large" placeholder="选择角色">
              <Option value={Role.STUDENT}>学生</Option>
              <Option value={Role.TEACHER}>教师</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            已有账号？ <Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
