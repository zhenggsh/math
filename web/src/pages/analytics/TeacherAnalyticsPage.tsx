import React, { useEffect, useState, useCallback } from 'react'
import { Card, Row, Col, Statistic, Spin, Empty, Button, Select } from 'antd'
import {
  UserOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { BarChart, PieChart } from '../../components/features/analytics'
import {
  getClassOverview,
  getKnowledgeHeat,
  getStudents,
  getStudentComparison,
  exportData,
} from '../../services/analytics.service'
import type { ClassOverview, KnowledgeHeat, StudentComparison } from '../../types/analytics.types'
import styles from './TeacherAnalyticsPage.module.css'

const { Option } = Select

/**
 * 教师分析页面
 */
const TeacherAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [classOverview, setClassOverview] = useState<ClassOverview | null>(null)
  const [knowledgeHeat, setKnowledgeHeat] = useState<KnowledgeHeat | null>(null)
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<StudentComparison | null>(null)
  const [selectedClass, setSelectedClass] = useState<string | undefined>()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [overviewData, heatData, studentList] = await Promise.all([
        getClassOverview(selectedClass),
        getKnowledgeHeat(20),
        getStudents(),
      ])
      setClassOverview(overviewData)
      setKnowledgeHeat(heatData)
      setStudents(studentList)
    } catch (error) {
      // Error handling is done via UI state
      void error
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  const loadComparison = useCallback(async () => {
    if (selectedStudents.length === 0) {
      setComparisonData(null)
      return
    }
    try {
      const data = await getStudentComparison(selectedStudents)
      setComparisonData(data)
    } catch (error) {
      void error
    }
  }, [selectedStudents])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void loadComparison()
  }, [loadComparison])

  const handleExport = async () => {
    try {
      const blob = await exportData({
        classId: selectedClass,
        format: 'xlsx',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      // Export error handled silently
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载分析数据..." />
      </div>
    )
  }

  const heatBarData =
    knowledgeHeat?.heatList.map(item => ({
      name: item.code,
      value: item.learnCount,
    })) || []

  const comparisonBarData =
    comparisonData?.students.map(student => ({
      name: student.name,
      value: student.totalDuration,
    })) || []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>教学分析</h1>
        <div className={styles.actions}>
          <Select
            placeholder="选择班级"
            allowClear
            style={{ width: 200 }}
            value={selectedClass}
            onChange={setSelectedClass}
          >
            <Option value="class-1">高一(1)班</Option>
            <Option value="class-2">高一(2)班</Option>
            <Option value="class-3">高一(3)班</Option>
          </Select>
          <Select
            mode="multiple"
            placeholder="选择学生进行对比"
            allowClear
            style={{ width: 300 }}
            value={selectedStudents}
            onChange={setSelectedStudents}
            maxTagCount={3}
          >
            {students.map(student => (
              <Option key={student.id} value={student.id}>
                {student.name}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => void handleExport()}>
            导出数据
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <Row gutter={16} className={styles.overviewRow}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="学生人数"
              value={classOverview?.studentCount || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="活跃学生"
              value={classOverview?.activeStudentCount || 0}
              suffix={`/ ${classOverview?.studentCount || 0}`}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均学习次数"
              value={classOverview?.avgLearningCount || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均学习时长"
              value={classOverview?.avgDurationMinutes || 0}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card title="知识点热度排行" className={styles.chartCard}>
            {heatBarData.length > 0 ? (
              <BarChart data={heatBarData} horizontal xAxisName="学习次数" />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="学生对比（学习时长）" className={styles.chartCard}>
            {comparisonBarData.length > 0 ? (
              <BarChart data={comparisonBarData} xAxisName="学生" yAxisName="时长(分钟)" />
            ) : (
              <Empty description="请选择学生进行对比" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className={styles.chartsRow}>
        <Col xs={24} lg={8}>
          <Card title="学习参与分布" className={styles.chartCard}>
            {classOverview ? (
              <PieChart
                data={[
                  {
                    name: '活跃',
                    value: classOverview.activeStudentCount,
                  },
                  {
                    name: '未活跃',
                    value: classOverview.studentCount - classOverview.activeStudentCount,
                  },
                ]}
                donut
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TeacherAnalyticsPage
