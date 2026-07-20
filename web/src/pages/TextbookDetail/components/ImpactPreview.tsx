import React, { useMemo } from 'react'
import { Alert, Descriptions, Empty, Statistic, Tag, Typography } from 'antd'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface ImpactPreviewProps {
  rows: XlsxPreviewRow[]
}

export const ImpactPreview: React.FC<ImpactPreviewProps> = ({ rows }) => {
  const validCodes = useMemo(() => {
    return rows
      .map((row) => row.code)
      .filter((code): code is string => Boolean(code))
  }, [rows])

  const levelDistribution = useMemo(() => {
    const dist = new Map<string, number>()
    rows.forEach((row) => {
      const key = row.level1 || '未分类'
      dist.set(key, (dist.get(key) || 0) + 1)
    })
    return Array.from(dist.entries()).map(([level, count]) => ({ level, count }))
  }, [rows])

  if (validCodes.length === 0) {
    return <Empty description="未识别到有效知识点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div>
      <Alert
        title="校验已通过"
        description="以下知识点将被追加到当前教材。确认后无法撤销，请仔细核对。"
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Typography.Paragraph data-testid="impact-summary" style={{ marginBottom: 16 }}>
        将新增 <strong>{validCodes.length}</strong> 个知识点
      </Typography.Paragraph>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <Statistic title="新增知识点数量" value={validCodes.length} />
        <Statistic title="首个编号" value={validCodes[0]} />
        <Statistic title="末个编号" value={validCodes[validCodes.length - 1]} />
      </div>
      <Descriptions bordered size="small" title="一级知识点分布">
        {levelDistribution.map(({ level, count }) => (
          <Descriptions.Item key={level} label={level}>
            <Tag color="blue">{count} 个</Tag>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  )
}

export default ImpactPreview
