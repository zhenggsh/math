import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Spin, Alert } from 'antd'
import mermaid from 'mermaid'
import type { MermaidRendererProps } from './types'
import styles from './MermaidRenderer.module.css'

// 初始化 Mermaid 配置
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  suppressErrorRendering: true,
})

/**
 * Mermaid 特殊字符转义表
 * 将半角特殊字符替换为对应的全角字符，避免 Mermaid 解析错误
 */
const MERMAID_ESCAPE_MAP: Record<string, string> = {
  '(': '（',
  ')': '）',
  '[': '［',
  ']': '］',
  '"': '"',
  "'": '\u2019',
  ':': '：',
  ';': '；',
}

/**
 * 尝试自动转义 Mermaid 内容中的特殊字符
 */
function escapeMermaidContent(value: string): string {
  return value.replace(/[()\[\]"':;]/g, (char) => MERMAID_ESCAPE_MAP[char] || char)
}

/**
 * Mermaid 图表渲染组件
 * 支持自动转义修复和错误提示
 */
export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ value }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 缓存规范化后的图表内容，避免无意义的重渲染
  const normalizedValue = useMemo(() => value.trim(), [value])

  useEffect(() => {
    let cancelled = false

    const renderDiagram = async (content: string, isEscaped = false): Promise<void> => {
      if (!content) {
        setSvg('')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // 生成唯一的图表 ID
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`

        // 渲染图表
        const { svg: renderedSvg } = await mermaid.render(id, content)

        if (!cancelled) {
          setSvg(renderedSvg)
          setLoading(false)
        }
      } catch (err) {
        if (cancelled) return

        // 首次失败且未尝试过转义：自动转义后重试
        if (!isEscaped) {
          const escapedContent = escapeMermaidContent(content)
          // 仅当转义后的内容与原始内容不同才重试
          if (escapedContent !== content) {
            void renderDiagram(escapedContent, true)
            return
          }
        }

        // 转义后仍失败或无需转义：显示错误提示
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram'
        setError(errorMessage)
        setLoading(false)
      }
    }

    void renderDiagram(normalizedValue)

    return () => {
      cancelled = true
    }
  }, [normalizedValue])

  if (loading) {
    return (
      <div className={styles.mermaidContainer}>
        <Spin size="small" tip="Rendering diagram..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.mermaidContainer}>
        <Alert
          message="图表渲染失败"
          description={
            <>
              <div>当前图表包含 Mermaid 不支持的语法或特殊字符，已尝试自动转义但未能修复。</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>错误信息：{error}</div>
            </>
          }
          type="warning"
          showIcon
          className={styles.errorAlert}
        />
        <pre className={styles.rawCode}>{value}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={styles.mermaidContainer}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default MermaidRenderer
