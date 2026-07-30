import { describe, expect, it } from 'vitest'

import {
  makeMdFile,
  makeXlsxFile,
  parseXlsxPreview,
  serializeXlsxPreview,
  type XlsxPreviewRow,
} from '../textbookFilePreview'

describe('textbookFilePreview serialization', () => {
  const sampleRows: XlsxPreviewRow[] = [
    { 知识点编号: '1.1.1', 一级知识点: '集合', 二级知识点: '集合概念', 三级知识点: '元素与集合' },
    { 知识点编号: '1.1.2', 一级知识点: '集合', 二级知识点: '集合概念', 三级知识点: '集合的表示' },
  ]

  it('makeXlsxFile creates a File with correct name and type', () => {
    const file = makeXlsxFile(sampleRows, 'framework.xlsx')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('framework.xlsx')
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  it('serializeXlsxPreview + parseXlsxPreview round-trips framework rows', async () => {
    const file = makeXlsxFile(sampleRows, 'framework.xlsx')
    const parsed = await parseXlsxPreview(file)
    expect(parsed).toHaveLength(sampleRows.length)
    expect(parsed).toEqual(sampleRows)
  })

  it('makeXlsxFile with empty rows round-trips to empty rows', async () => {
    const file = makeXlsxFile([], 'empty.xlsx')
    const parsed = await parseXlsxPreview(file)
    expect(parsed).toEqual([])
  })

  it('makeMdFile creates a File with correct name, type and content', () => {
    const content = '# 第一章 集合\n\n集合是数学中的基本概念。'
    const file = makeMdFile(content, 'content.md')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('content.md')
    expect(file.type).toBe('text/markdown')
  })

  it('serializeXlsxPreview uses provided sheet name in workbook', async () => {
    const blob = serializeXlsxPreview(sampleRows, 'CustomSheet')
    const file = new File([blob], 'custom.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const parsed = await parseXlsxPreview(file)
    expect(parsed).toEqual(sampleRows)
  })
})
