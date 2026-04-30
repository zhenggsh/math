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
 * Mermaid 图表渲染组件
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

    const renderDiagram = async () => {
      if (!normalizedValue) {
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
        const { svg: renderedSvg } = await mermaid.render(id, normalizedValue)

        if (!cancelled) {
          setSvg(renderedSvg)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setLoading(false)
        }
      }
    }

    void renderDiagram()

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
          message="Diagram render error"
          description={error}
          type="error"
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
