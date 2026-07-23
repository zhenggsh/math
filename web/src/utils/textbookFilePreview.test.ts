import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxPreview } from './textbookFilePreview'

function buildXlsxFile(sheets: Record<string, unknown[][]>, name = 'test.xlsx'): File {
  const wb = XLSX.utils.book_new()
  for (const [sheetName, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName)
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([out], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('parseXlsxPreview 多 sheet', () => {
  it('封面在前时选中框架 sheet 并 trim 表头', async () => {
    const file = buildXlsxFile({
      封面: [['高中数学必修一 知识点框架'], ['知识点总数', '2']],
      知识点框架: [
        ['一级知识点 ', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', ' 知识点编号'],
        ['集合', '集合的概念', '集合的含义', '研究对象的总体', '确定性', 'A', '1.1.1'],
        ['集合', '集合的概念', '集合的表示', '列举法', '互异性', 'B', '1.1.2'],
      ],
    })
    const rows = await parseXlsxPreview(file)
    expect(rows).toHaveLength(2)
    expect(rows[0]['知识点编号']).toBe('1.1.1')
    expect(rows[0]['一级知识点']).toBe('集合')
  })

  it('无合规框架 sheet 时返回空数组', async () => {
    const file = buildXlsxFile({ 封面: [['只有封面'], ['没有框架']] })
    const rows = await parseXlsxPreview(file)
    expect(rows).toEqual([])
  })
})
