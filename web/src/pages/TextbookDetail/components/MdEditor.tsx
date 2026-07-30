import React, { useState } from 'react'
import { Input, Button, Space, Alert, Typography, Select, message } from 'antd'
import type { EditorRow } from '../../../utils/knowledgeBlocks'

interface MdEditorProps {
  content: string
  onChange: (content: string) => void
  fileSize: number
  selectedRows?: EditorRow[]
}

const MAX_MD_SIZE = 1024 * 1024

const HEADING_CODE_PATTERN = /^\s*(?:知识点\s+)?(\d+(?:\.\d+)*)/

function extractHeadingCode(line: string, prefix: string): string | null {
  const rest = line.slice(prefix.length + 1)
  const match = rest.match(HEADING_CODE_PATTERN)
  return match ? match[1] : null
}

export const MdEditor: React.FC<MdEditorProps> = ({
  content,
  onChange,
  fileSize,
  selectedRows,
}) => {
  const [sourceLevel, setSourceLevel] = useState<number>(2)
  const [targetLevel, setTargetLevel] = useState<number>(3)
  const [scope, setScope] = useState<'all' | 'selected'>('all')

  const disabled = fileSize > MAX_MD_SIZE

  const handleBatchReplace = (): void => {
    if (disabled) return
    const sourcePrefix = '#'.repeat(sourceLevel)
    const targetPrefix = '#'.repeat(targetLevel)
    const selectedCodes =
      selectedRows?.map(row => row['知识点编号']).filter((code): code is string => Boolean(code)) ??
      []
    if (scope === 'selected' && selectedCodes.length === 0) {
      message.warning('未选中任何行，无法应用替换')
      return
    }
    const lines = content.split('\n')
    const nextLines = lines.map(line => {
      if (!line.startsWith(`${sourcePrefix} `)) return line
      const code = extractHeadingCode(line, sourcePrefix)
      if (scope === 'selected' && code && !selectedCodes.includes(code)) return line
      return `${targetPrefix} ${line.slice(sourcePrefix.length + 1)}`
    })
    onChange(nextLines.join('\n'))
  }

  if (disabled) {
    return (
      <Alert
        message="Markdown 文件超过 1 MB"
        description={`当前文件 ${(fileSize / 1024 / 1024).toFixed(2)} MB，已超过 1 MB 限制。请使用本地编辑器修改后重新上传。`}
        type="warning"
        showIcon
      />
    )
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Typography.Text strong>批量替换标题层级</Typography.Text>
        <Select
          value={sourceLevel}
          onChange={setSourceLevel}
          options={[
            { value: 2, label: '##' },
            { value: 3, label: '###' },
            { value: 4, label: '####' },
          ]}
          style={{ width: 80 }}
        />
        <span>→</span>
        <Select
          value={targetLevel}
          onChange={setTargetLevel}
          options={[
            { value: 2, label: '##' },
            { value: 3, label: '###' },
            { value: 4, label: '####' },
          ]}
          style={{ width: 80 }}
        />
        <Select
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: '全部' },
            { value: 'selected', label: '仅选中的行' },
          ]}
          style={{ width: 120 }}
        />
        <Button size="small" onClick={handleBatchReplace}>
          替换
        </Button>
      </div>
      <Input.TextArea
        value={content}
        onChange={e => onChange(e.target.value)}
        rows={18}
        style={{ fontFamily: 'monospace', fontSize: 13 }}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        提示：xlsx 编辑会自动同步 Markdown 标题；直接编辑 Markdown 正文不会反向同步到 xlsx。
      </Typography.Text>
    </Space>
  )
}

export default MdEditor
