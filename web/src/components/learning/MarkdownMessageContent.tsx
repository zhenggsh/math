import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import styles from './MarkdownMessageContent.module.css'

export interface MarkdownMessageContentProps {
  content: string
}

interface ErrorBoundaryProps {
  contentKey: string
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class MarkdownRenderErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.contentKey !== this.props.contentKey) {
      this.setState({ hasError: false })
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <span className={styles.renderError}>内容渲染出错，已显示原文。</span>
    }
    return this.props.children
  }
}

export const MarkdownMessageContent: React.FC<MarkdownMessageContentProps> = ({ content }) => {
  return (
    <div className={styles.markdownContent}>
      <MarkdownRenderErrorBoundary contentKey={content}>
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </MarkdownRenderErrorBoundary>
    </div>
  )
}

export default MarkdownMessageContent
