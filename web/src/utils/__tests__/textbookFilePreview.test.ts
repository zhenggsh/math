import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseCsvPreview,
  parseFrameworkPreview,
  parseXlsxPreview,
  readTextFile,
} from '../textbookFilePreview'

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
