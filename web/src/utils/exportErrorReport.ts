import type { ValidationIssue } from '../types/textbook.types'

export function downloadErrorReport(errors: ValidationIssue[], filename: string): void {
  const lines = [
    '校验错误报告',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    '',
    ...errors.map(err => {
      const location = err.location.code
        ? `编号 ${err.location.code}`
        : err.location.row
          ? `第 ${err.location.row} 行`
          : '未知位置'
      return `[${err.type}] ${location}：${err.message}`
    }),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
