import React, { useMemo, useRef, useEffect } from 'react'
import { Empty, Typography } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'

interface MdPreviewProps {
  content: string
  errors: ValidationIssue[]
  highlightedLine?: number
}

export const MdPreview: React.FC<MdPreviewProps> = ({ content, errors, highlightedLine }) => {
  const lines = useMemo(() => content.split('\n'), [content])
  const errorMap = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>()
    errors.forEach(err => {
      if (err.location.row) {
        const list = map.get(err.location.row) || []
        list.push(err)
        map.set(err.location.row, list)
      }
    })
    return map
  }, [errors])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightedLine && containerRef.current) {
      const element = containerRef.current.querySelector(`[data-line="${highlightedLine}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedLine])

  if (!content) {
    return (
      <div
        style={{
          height: '100%',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          background: '#fafafa',
        }}
      >
        <Empty description="选择文件后在此处预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.6,
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: 12,
        height: '100%',
        minHeight: 200,
        overflow: 'auto',
        background: '#fafafa',
        boxSizing: 'border-box',
      }}
    >
      {lines.map((line, index) => {
        const lineNumber = index + 1
        const lineErrors = errorMap.get(lineNumber)
        const isHighlighted = highlightedLine === lineNumber
        const lineBackground = isHighlighted ? '#fff7e6' : lineErrors ? '#fff1f0' : '#fafafa'
        return (
          <div
            key={`md-line-${lineNumber}`}
            data-line={lineNumber}
            style={{
              display: 'flex',
              width: 'max-content',
              minWidth: '100%',
              backgroundColor: lineBackground,
              padding: '2px 0',
              transition: 'background-color 0.3s',
            }}
          >
            <span
              style={{
                color: '#999',
                minWidth: 36,
                textAlign: 'right',
                paddingRight: 12,
                userSelect: 'none',
                position: 'sticky',
                left: 0,
                backgroundColor: lineBackground,
              }}
            >
              {lineNumber}
            </span>
            <span style={{ flex: 1, whiteSpace: 'pre' }}>{line || ' '}</span>
          </div>
        )
      })}
      {Array.from(errorMap.entries()).map(([lineNumber, lineErrors]) => (
        <div key={`md-error-${lineNumber}`} style={{ padding: '4px 0 4px 48px', fontSize: 12 }}>
          <Typography.Text type="danger">
            ✗ 第 {lineNumber} 行：{lineErrors.map(e => e.message).join('；')}
          </Typography.Text>
        </div>
      ))}
    </div>
  )
}

export default MdPreview
