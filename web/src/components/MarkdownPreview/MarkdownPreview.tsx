import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Spin, Empty, Segmented } from 'antd'
import { EyeOutlined, CodeOutlined } from '@ant-design/icons'
import 'katex/dist/katex.min.css'
import type { MarkdownPreviewProps } from './types'
import { MermaidRenderer } from './MermaidRenderer'
import styles from './MarkdownPreview.module.css'

/**
 * 代码块组件
 */
const CodeBlock: React.FC<{ language?: string; value: string }> = ({ language, value }) => {
  // 如果是 mermaid 代码块，使用 Mermaid 渲染器
  if (language === 'mermaid') {
    return <MermaidRenderer value={value} />
  }

  return (
    <pre className={styles.codeBlock}>
      <code className={language ? `language-${language}` : undefined}>{value}</code>
    </pre>
  )
}

/**
 * Markdown 预览组件
 * 支持基础 Markdown、LaTeX 数学公式、Mermaid 图表
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  showRaw: controlledShowRaw,
  loading = false,
  className = '',
}) => {
  const [internalShowRaw, setInternalShowRaw] = useState(false)
  const showRaw = controlledShowRaw !== undefined ? controlledShowRaw : internalShowRaw

  // 自定义组件映射
  const components = useMemo(
    () => ({
      code({
        inline,
        className: codeClassName,
        children,
        ...rest
      }: {
        inline?: boolean
        className?: string
        children?: React.ReactNode
      } & Record<string, unknown>) {
        const match = /language-(\w+)/.exec(codeClassName || '')
        const language = match ? match[1] : undefined
        const value = (
          Array.isArray(children) ? children.join('') : typeof children === 'string' ? children : ''
        ).replace(/\n$/, '')

        if (!inline && language) {
          return <CodeBlock language={language} value={value} />
        }

        return (
          <code className={codeClassName} {...rest}>
            {children}
          </code>
        )
      },
    }),
    []
  )

  // 处理视图切换
  const handleViewChange = (value: string | number) => {
    if (controlledShowRaw === undefined) {
      setInternalShowRaw(value === 'raw')
    }
  }

  // 视图选项
  const viewOptions = [
    { value: 'preview', label: 'Preview', icon: <EyeOutlined /> },
    { value: 'raw', label: 'Raw', icon: <CodeOutlined /> },
  ]

  if (loading) {
    return (
      <div className={`${styles.markdownPreview} ${className}`}>
        <Spin size="large" tip="Loading content..." />
      </div>
    )
  }

  if (!content) {
    return (
      <div className={`${styles.markdownPreview} ${className}`}>
        <Empty description="No content available" />
      </div>
    )
  }

  return (
    <div className={`${styles.markdownPreview} ${className}`}>
      <div className={styles.toolbar}>
        <Segmented
          options={viewOptions}
          value={showRaw ? 'raw' : 'preview'}
          onChange={handleViewChange}
          className={styles.viewSwitch}
        />
      </div>
      <div className={styles.content}>
        {showRaw ? (
          <pre className={styles.rawContent}>
            <code>{content}</code>
          </pre>
        ) : (
          <div className={styles.renderedContent}>
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={components}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarkdownPreview
