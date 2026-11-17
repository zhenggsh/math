import React, { useRef, useState } from 'react'
import { Button, Space, Alert, Typography, Select, message } from 'antd'
import type { EditorRow } from '../../../utils/knowledgeBlocks'

interface MdEditorProps {
  content: string
  onChange: (content: string) => void
  fileSize: number
  selectedRows?: EditorRow[]
}

interface LineNumberedTextAreaProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  disabled?: boolean
}

const MAX_MD_SIZE = 1024 * 1024

const TEXT_AREA_STYLE: React.CSSProperties = {
  width: '100%',
  resize: 'none',
  border: 'none',
  outline: 'none',
  padding: '8px 12px',
  margin: 0,
  fontFamily: 'monospace',
  fontSize: 13,
  lineHeight: '20px',
  whiteSpace: 'pre',
  overflowWrap: 'normal',
  overflowX: 'auto',
  background: 'transparent',
  color: 'rgba(0, 0, 0, 0.88)',
}

const HEADING_CODE_PATTERN = /^\s*(?:知识点\s+)?(\d+(?:\.\d+)*)/

function extractHeadingCode(line: string, prefix: string): string | null {
  const rest = line.slice(prefix.length + 1)
  const match = rest.match(HEADING_CODE_PATTERN)
  return match ? match[1] : null
}

const LineNumberedTextArea: React.FC<LineNumberedTextAreaProps> = ({
  value,
  onChange,
  rows = 18,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const numbersRef = useRef<HTMLDivElement>(null)
  const lineCount = value.split('\n').length
  const minLines = Math.max(rows, lineCount)
  const numbers = Array.from({ length: minLines }, (_, i) => i + 1)

  const handleScroll = (): void => {
    if (textareaRef.current && numbersRef.current) {
      numbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        overflow: 'hidden',
        background: disabled ? '#f5f5f5' : '#fff',
      }}
    >
      <div
        ref={numbersRef}
        style={{
          width: 48,
          flexShrink: 0,
          padding: '8px 4px',
          textAlign: 'right',
          background: '#fafafa',
          borderRight: '1px solid #f0f0f0',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {numbers.map(n => (
          <div
            key={n}
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: '20px',
              color: '#8c8c8c',
              height: 20,
            }}
          >
            {n}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={handleScroll}
        disabled={disabled}
        rows={rows}
        style={TEXT_AREA_STYLE}
      />
    </div>
  )
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
    let hasChanged = false
    const nextLines = lines.map(line => {
      if (!line.startsWith(`${sourcePrefix} `)) return line
      const code = extractHeadingCode(line, sourcePrefix)
      if (scope === 'selected' && (!code || !selectedCodes.includes(code))) return line
      hasChanged = true
      return `${targetPrefix} ${line.slice(sourcePrefix.length + 1)}`
    })
    if (scope === 'selected' && !hasChanged) {
      message.warning('未选中任何行，无法应用替换')
      return
    }
    onChange(nextLines.join('\n'))
  }

  if (disabled) {
    return (
      <Alert
        title="Markdown 文件超过 1 MB"
        description={`当前文件 ${(fileSize / 1024 / 1024).toFixed(2)} MB，已超过 1 MB 限制。请使用本地编辑器修改后重新上传。`}
        type="warning"
        showIcon
      />
    )
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
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
        <Button size="small" onClick={handleBatchReplace} disabled={sourceLevel === targetLevel}>
          替换
        </Button>
      </div>
      <LineNumberedTextArea value={content} onChange={onChange} rows={18} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        提示：xlsx 编辑会自动同步 Markdown 标题；直接编辑 Markdown 正文不会反向同步到 xlsx。
      </Typography.Text>
    </Space>
  )
}

export default MdEditor
