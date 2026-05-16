import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Spin, Empty } from 'antd'
import 'katex/dist/katex.min.css'
import type { MarkdownPreviewProps } from './types'
import { MermaidRenderer } from './MermaidRenderer'
import styles from './MarkdownPreview.module.css'

interface MarkdownRenderErrorBoundaryProps {
  contentKey: string
  children: React.ReactNode
}

interface MarkdownRenderErrorBoundaryState {
  hasError: boolean
}

/**
 * 捕获 KaTeX / Markdown 管线中的同步渲染异常，避免整页白屏
 */
class MarkdownRenderErrorBoundary extends React.Component<
  MarkdownRenderErrorBoundaryProps,
  MarkdownRenderErrorBoundaryState
> {
  constructor(props: MarkdownRenderErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): MarkdownRenderErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: MarkdownRenderErrorBoundaryProps): void {
    if (prevProps.contentKey !== this.props.contentKey) {
      this.setState({ hasError: false })
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <Empty description="公式或 Markdown 无法正常渲染，可切换到 Raw 视图查看或编辑原文。" />
    }
    return this.props.children
  }
}

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
 * 视图切换由外部控制（showRaw prop）
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  showRaw = false,
  loading = false,
  className = '',
  editable = false,
  onContentChange,
}) => {
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

  if (loading) {
    return (
      <div className={`${styles.markdownPreview} ${className}`}>
        <Spin size="large" description="Loading content..." />
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
      <div className={styles.content}>
        {showRaw ? (
          editable && onContentChange ? (
            <textarea
              className={styles.rawEditor}
              value={content}
              onChange={e => onContentChange(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre className={styles.rawContent}>
              <code>{content}</code>
            </pre>
          )
        ) : (
          <div className={styles.renderedContent}>
            <MarkdownRenderErrorBoundary contentKey={content}>
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={components as React.ComponentProps<typeof ReactMarkdown>['components']}
              >
                {content}
              </ReactMarkdown>
            </MarkdownRenderErrorBoundary>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarkdownPreview
