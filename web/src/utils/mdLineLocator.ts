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
  if (!mdText) {
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
