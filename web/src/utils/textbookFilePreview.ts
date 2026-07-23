import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface XlsxPreviewRow {
  [header: string]: string
}

export const CODE_HEADERS = ['知识点编号', '编号', 'code']
const LEVEL1_HEADERS = ['一级知识点', 'level1']
const LEVEL2_HEADERS = ['二级知识点', 'level2']
const LEVEL3_HEADERS = ['三级知识点', 'level3']

function getHeaderValue(record: XlsxPreviewRow, headers: string[]): string | undefined {
  for (const header of headers) {
    const value = record[header]
    if (value && value.trim() !== '') {
      return value.trim()
    }
  }
  return undefined
}

export function getRecordCode(record: XlsxPreviewRow): string | undefined {
  return getHeaderValue(record, CODE_HEADERS)
}

export function getRecordLevel1(record: XlsxPreviewRow): string | undefined {
  return getHeaderValue(record, LEVEL1_HEADERS)
}

export function getRecordLevel2(record: XlsxPreviewRow): string | undefined {
  return getHeaderValue(record, LEVEL2_HEADERS)
}

export function getRecordLevel3(record: XlsxPreviewRow): string | undefined {
  return getHeaderValue(record, LEVEL3_HEADERS)
}

const CODE_PATTERN = /^\d+(\.\d+){2,}/

/**
 * 判断记录集是否为合规知识点框架（与服务端 isValidKnowledgeFramework 镜像）：
 * 任一记录的编号列匹配 a.b.c 模式，或同时存在一级与三级知识点列
 */
function isValidFrameworkRecords(records: XlsxPreviewRow[]): boolean {
  if (records.length === 0) {
    return false
  }
  const hasCode = records.some(record => {
    const code = getRecordCode(record)
    return code !== undefined && CODE_PATTERN.test(code)
  })
  if (hasCode) {
    return true
  }
  const hasLevel1 = records.some(r => getRecordLevel1(r) !== undefined)
  const hasLevel3 = records.some(r => getRecordLevel3(r) !== undefined)
  return hasLevel1 && hasLevel3
}

/**
 * worksheet → 记录数组（与服务端 sheetToRecords 镜像）：
 * 第一个非空行作为表头（trim），空表头列跳过
 */
function sheetToRecords(worksheet: XLSX.WorkSheet): XlsxPreviewRow[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
  if (rawRows.length === 0) {
    return []
  }

  let headerRowIndex = 0
  while (headerRowIndex < rawRows.length) {
    const row = rawRows[headerRowIndex]
    if (
      row.some(cell => {
        const value = cell as string | number | boolean | null | undefined
        return value !== undefined && value !== null && String(value).trim() !== ''
      })
    ) {
      break
    }
    headerRowIndex++
  }
  if (headerRowIndex >= rawRows.length) {
    return []
  }

  const headers = rawRows[headerRowIndex].map(cell => {
    const value = cell as string | number | boolean | null | undefined
    return value === undefined || value === null ? '' : String(value).trim()
  })
  return rawRows.slice(headerRowIndex + 1).map(row => {
    const record: XlsxPreviewRow = {}
    headers.forEach((header, index) => {
      if (header !== '') {
        const value = row[index] as string | number | boolean | null | undefined
        record[header] = value === undefined || value === null ? '' : String(value)
      }
    })
    return record
  })
}

/**
 * 检测 workbook 中的框架 sheet（与服务端 detectFrameworkSheet 镜像）
 */
function detectFrameworkSheet(workbook: XLSX.WorkBook): XlsxPreviewRow[] | null {
  for (const sheetName of workbook.SheetNames) {
    const records = sheetToRecords(workbook.Sheets[sheetName])
    if (isValidFrameworkRecords(records)) {
      return records
    }
  }
  return null
}

export async function parseXlsxPreview(file: File, limit = 100): Promise<XlsxPreviewRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  const workbook = XLSX.read(data, { type: 'array' })

  const records = detectFrameworkSheet(workbook)
  if (!records) {
    return []
  }
  return records.slice(0, limit)
}

export async function parseCsvPreview(file: File, limit = 100): Promise<XlsxPreviewRow[]> {
  const text = await readTextFile(file)
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const rows = (results.data as Record<string, unknown>[]).slice(0, limit).map(row => {
          const record: XlsxPreviewRow = {}
          Object.keys(row).forEach(key => {
            const value = row[key] as string | number | boolean | null | undefined
            record[key] = value === undefined || value === null ? '' : String(value)
          })
          return record
        })
        resolve(rows)
      },
      error: (error: { message: string }) => reject(new Error(error.message)),
    })
  })
}

export async function parseFrameworkPreview(file: File, limit = 100): Promise<XlsxPreviewRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsvPreview(file, limit)
  }
  return parseXlsxPreview(file, limit)
}

export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
