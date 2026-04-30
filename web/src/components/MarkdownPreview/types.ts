/**
 * Markdown 预览组件 Props
 */
export interface MarkdownPreviewProps {
  /** Markdown 内容 */
  content: string
  /** 是否显示原始 Markdown */
  showRaw?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * KaTeX 渲染器 Props
 */
export interface KaTeXRendererProps {
  /** 公式内容 */
  value: string
  /** 是否为行内公式 */
  inline?: boolean
}

/**
 * Mermaid 渲染器 Props
 */
export interface MermaidRendererProps {
  /** Mermaid 图表定义 */
  value: string
}

/**
 * Markdown 上下文信息
 */
export interface MarkdownContext {
  /** 当前知识点 */
  knowledgePoint?: {
    id: string
    code: string
    title: string
  }
  /** 当前教材 */
  textbook?: {
    id: string
    name: string
  }
}
