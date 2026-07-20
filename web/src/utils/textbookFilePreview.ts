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

export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
