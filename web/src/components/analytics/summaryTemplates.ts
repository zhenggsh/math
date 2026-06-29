export interface SummaryInput {
  textbookName: string
  totalKnowledgePoints: number
  learnedCount: number
  weakPointCount: number
  totalDurationMinutes: number
  mostRecentLearningDate?: string
  topWeakPointName?: string
}

export function generateSummary(input: SummaryInput): string {
  const {
    textbookName,
    totalKnowledgePoints,
    learnedCount,
    weakPointCount,
    totalDurationMinutes,
    mostRecentLearningDate,
    topWeakPointName,
  } = input

  if (totalKnowledgePoints === 0) {
    return `《${textbookName}》暂无知识点数据，请确认教材内容是否已正确导入。`
  }

  const coverage =
    totalKnowledgePoints > 0 ? Math.round((learnedCount / totalKnowledgePoints) * 100) : 0
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationText = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`

  let summary = `你在《${textbookName}》的学习覆盖率为 ${coverage}%（${learnedCount}/${totalKnowledgePoints}），累计学习时长约 ${durationText}。`

  if (mostRecentLearningDate) {
    const formattedDate = new Date(mostRecentLearningDate).toLocaleDateString('zh-CN')
    summary += `最近一次学习发生在 ${formattedDate}。`
  }

  if (weakPointCount > 0 && topWeakPointName) {
    summary += `目前共有 ${weakPointCount} 个薄弱知识点，建议优先复习「${topWeakPointName}」，巩固基础后再推进新内容。`
  } else {
    summary += `当前没有明显薄弱知识点，学习状态良好，建议保持节奏并定期复习已学内容。`
  }

  return summary
}
