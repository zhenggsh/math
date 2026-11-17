/**
 * 在 md 文本中查找知识点编号对应的标题行号（1-based）
 * 优先精确匹配标题行（##/###/####，可带"知识点 "前缀），
 * 未命中时退化到其后代编号的第一行（如 2.4 → 2.4.1）。
 * 负向前瞻 (?![\d.]) 防止 1.1 误匹配 1.10。
 *
 * 纯函数：与 React 无关，供扩充弹窗与教材详情页共用。
 * （原样搬迁自 ExpandKnowledgePointsModal 内联实现）
 */
export function findMdLineByCode(mdText: string, code: string): number | undefined {
  if (!mdText || !code) {
    return undefined
  }
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lines = mdText.split('\n')

  const exactPattern = new RegExp(`^#{2,4}\\s+(?:知识点\\s+)?${escaped}(?![\\d.])`)
  for (let i = 0; i < lines.length; i++) {
    if (exactPattern.test(lines[i])) {
      return i + 1
    }
  }

  const childPattern = new RegExp(`^#{2,4}\\s+(?:知识点\\s+)?${escaped}\\.\\d`)
  for (let i = 0; i < lines.length; i++) {
    if (childPattern.test(lines[i])) {
      return i + 1
    }
  }

  return undefined
}

export interface MdBlock {
  /** 包含标题行的完整内容块 */
  block: string
  /** 标题行号（1-based） */
  startLine: number
}

/**
 * 提取知识点编号对应的 md 内容块（含标题行）。
 * 起始行：#{2,4} 标题且编号精确匹配（可带"知识点 "前缀）；
 * 结束行：下一个同级或更高级标题，或 --- 分隔线。
 * 与服务端 findContentBlockRange 的边界规则保持一致。
 */
export function extractMdBlockByCode(mdText: string, code: string): MdBlock | undefined {
  if (!mdText || !code) {
    return undefined
  }
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lines = mdText.split('\n')
  const startPattern = new RegExp(`^(#{2,4})\\s+(?:知识点\\s+)?${escaped}(?![\\d.])`)

  let startIndex = -1
  let level = 0
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(startPattern)
    if (match) {
      startIndex = i
      level = match[1].length
      break
    }
  }
  if (startIndex < 0) {
    return undefined
  }

  const endHeadingPattern = new RegExp(`^#{1,${level}}\\s`)
  const separatorPattern = /^---\s*$/
  let endIndex = lines.length
  for (let j = startIndex + 1; j < lines.length; j++) {
    if (endHeadingPattern.test(lines[j]) || separatorPattern.test(lines[j])) {
      endIndex = j
      break
    }
  }

  return {
    block: lines.slice(startIndex, endIndex).join('\n').trimEnd(),
    startLine: startIndex + 1,
  }
}
