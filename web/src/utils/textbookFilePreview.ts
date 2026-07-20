import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface XlsxPreviewRow {
  [header: string]: string
}

export async function parseXlsxPreview(file: File, limit = 100): Promise<XlsxPreviewRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  const workbook = XLSX.read(data, { type: 'array' })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return []
  }

  const worksheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
  if (rawRows.length === 0) {
    return []
  }

  const headers = rawRows[0].map(String)
  return rawRows.slice(1, limit + 1).map(row => {
    const record: XlsxPreviewRow = {}
    headers.forEach((header, index) => {
      const value = row[index] as string | number | boolean | null | undefined
      record[header] = value === undefined || value === null ? '' : String(value)
    })
    return record
  })
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
