import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseCsvPreview,
  parseFrameworkPreview,
  parseXlsxPreview,
  readTextFile,
} from '../textbookFilePreview'

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

describe('textbookFilePreview', () => {
  it('parses xlsx rows into preview objects', async () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['知识点编号', '一级知识点', '二级知识点'],
      ['1.1.1', '集合', '集合的含义'],
      ['1.1.2', '集合', '元素与集合的关系'],
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = new Uint8Array(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as number[]
    )
    const file = new File([buffer], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const rows = await parseXlsxPreview(file)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      知识点编号: '1.1.1',
      一级知识点: '集合',
      二级知识点: '集合的含义',
    })
    expect(rows[1]).toEqual({
      知识点编号: '1.1.2',
      一级知识点: '集合',
      二级知识点: '元素与集合的关系',
    })
  })

  it('limits xlsx preview rows', async () => {
    const workbook = XLSX.utils.book_new()
    const data = [['编号'], ...Array.from({ length: 5 }, (_, i) => [`1.1.${i + 1}`])]
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = new Uint8Array(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as number[]
    )
    const file = new File([buffer], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const rows = await parseXlsxPreview(file, 2)

    expect(rows).toHaveLength(2)
  })

  it('reads md file as text', async () => {
    const file = new File(['#### 1.1.1 集合的含义\n\n这是内容。'], 'expand.md', {
      type: 'text/markdown',
    })

    const text = await readTextFile(file)

    expect(text).toBe('#### 1.1.1 集合的含义\n\n这是内容。')
  })

  it('parses csv rows into preview objects', async () => {
    const csv = 'code,level1,level2\n1.1.1,集合,集合的含义\n1.1.2,集合,元素与集合'
    const file = new File([csv], 'expand.csv', { type: 'text/csv' })

    const rows = await parseCsvPreview(file)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      code: '1.1.1',
      level1: '集合',
      level2: '集合的含义',
    })
  })

  it('limits csv preview rows', async () => {
    const csv = 'code\n' + Array.from({ length: 5 }, (_, i) => `${i + 1}`).join('\n')
    const file = new File([csv], 'expand.csv', { type: 'text/csv' })

    const rows = await parseCsvPreview(file, 2)

    expect(rows).toHaveLength(2)
  })

  it('dispatches to csv or xlsx parser by extension', async () => {
    const csv = 'code,level1\n1.1.1,集合'
    const csvFile = new File([csv], 'expand.csv', { type: 'text/csv' })

    const csvRows = await parseFrameworkPreview(csvFile)
    expect(csvRows).toHaveLength(1)
    expect(csvRows[0].code).toBe('1.1.1')
  })
})

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

  it('表头用 一级/三级 简写别名且无编号列时也能检测为框架', async () => {
    const file = buildXlsxFile({
      封面: [['封面信息']],
      框架: [
        ['一级', '二级', '三级', '定义'],
        ['集合', '集合的概念', '集合的含义', '研究对象的总体'],
      ],
    })
    const rows = await parseXlsxPreview(file)
    expect(rows).toHaveLength(1)
    expect(rows[0]['一级']).toBe('集合')
    expect(rows[0]['三级']).toBe('集合的含义')
  })

  it('表头前有前置空行时仍能正确检测表头', async () => {
    const file = buildXlsxFile({
      框架: [
        [],
        [],
        ['一级知识点', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', '知识点编号'],
        ['集合', '集合的概念', '集合的含义', '总体', '确定性', 'A', '1.1.1'],
      ],
    })
    const rows = await parseXlsxPreview(file)
    expect(rows).toHaveLength(1)
    expect(rows[0]['知识点编号']).toBe('1.1.1')
  })
})
