import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'
import { getRecordCode, makeMdFile, makeXlsxFile } from '../../../utils/textbookFilePreview'
import {
  deleteBlockForRow,
  insertBlockForRow,
  parseKnowledgeBlocks,
  serializeKnowledgeBlocks,
  updateBlockForRow,
  type EditorRow,
  type KnowledgeBlock,
} from '../../../utils/knowledgeBlocks'
import { generateId } from '../../../utils/generateId'

interface UseExpansionEditorOptions {
  textbookId: string
  originalRows: XlsxPreviewRow[]
  originalMd: string
  onValidate: (frameworkFile: File, contentFile: File) => Promise<void>
  onResetValidation: () => void
  originalFrameworkFile?: File | null
  originalContentFile?: File | null
}

interface UseExpansionEditorReturn {
  editMode: boolean
  frameworkRows: EditorRow[]
  mdContent: string
  selectedRowIds: string[]
  hasUnsavedChanges: boolean
  enterEditMode: () => void
  exitEditMode: () => void
  updateRow: (rowId: string, patch: Partial<XlsxPreviewRow>) => void
  addRow: () => void
  deleteRow: (rowId: string) => void
  insertRowAfter: (rowId: string) => void
  updateMdContent: (content: string) => void
  batchReplaceHeadings: (sourceLevel: number, targetLevel: number, scope: 'all' | string[]) => void
  toggleRowSelection: (rowId: string) => void
  revalidateFiles: () => Promise<void>
  saveDraft: () => void
  loadDraft: () => boolean
  clearDraft: () => void
  mdSyncWarnings: Map<string, string>
}

const DRAFT_KEY_PREFIX = 'math-tong-expansion-editor-draft'

function cloneRows(rows: EditorRow[]): EditorRow[] {
  return rows.map(row => ({ ...row }))
}

function mergePatch(row: EditorRow, patch: Partial<XlsxPreviewRow>): EditorRow {
  const merged: EditorRow = { ...row }
  for (const key of Object.keys(patch)) {
    const value = patch[key]
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged
}

function toXlsxRow(row: EditorRow): XlsxPreviewRow {
  const result: XlsxPreviewRow = {}
  for (const key of Object.keys(row)) {
    if (key !== 'rowId') {
      result[key] = row[key]
    }
  }
  return result
}

function buildBlockMap(rows: EditorRow[], blocks: KnowledgeBlock[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    const code = getRecordCode(row)
    if (!code) continue
    const block = blocks.find(b => b.code === code)
    if (block) {
      map.set(row.rowId, block.id)
    }
  }
  return map
}

function incrementCodeSibling(code: string): string | undefined {
  const parts = code.split('.')
  const last = parts[parts.length - 1]
  const num = Number.parseInt(last, 10)
  if (Number.isNaN(num)) return undefined
  parts[parts.length - 1] = String(num + 1)
  return parts.join('.')
}

interface DataState {
  frameworkRows: EditorRow[]
  blocks: KnowledgeBlock[]
  blockMap: Map<string, string>
  mdContent: string
}

function initDataState(originalRows: XlsxPreviewRow[], originalMd: string): DataState {
  const frameworkRows = originalRows.map(row => ({ ...row, rowId: generateId() }))
  const mdContent = originalMd
  const blocks = parseKnowledgeBlocks(mdContent)
  const blockMap = buildBlockMap(frameworkRows, blocks)
  return { frameworkRows, blocks, blockMap, mdContent }
}

type Action =
  | { type: 'UPDATE_ROW'; rowId: string; patch: Partial<XlsxPreviewRow> }
  | { type: 'ADD_ROW' }
  | { type: 'INSERT_ROW_AFTER'; rowId: string }
  | { type: 'DELETE_ROW'; rowId: string }
  | { type: 'SET_MD_CONTENT'; content: string }
  | {
      type: 'BATCH_REPLACE_HEADINGS'
      sourceLevel: number
      targetLevel: number
      scope: 'all' | string[]
    }
  | { type: 'LOAD_DRAFT'; frameworkRows: EditorRow[]; mdContent: string }
  | { type: 'RESET'; originalRows: XlsxPreviewRow[]; originalMd: string }

function reduceDataState(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'UPDATE_ROW': {
      const nextRows = cloneRows(state.frameworkRows)
      const index = nextRows.findIndex(r => r.rowId === action.rowId)
      if (index === -1) return state
      nextRows[index] = mergePatch(nextRows[index], action.patch)
      const row = nextRows[index]
      const blockId = state.blockMap.get(action.rowId)
      let nextBlocks = state.blocks
      const nextMap = new Map(state.blockMap)
      if (blockId) {
        nextBlocks = updateBlockForRow(state.blocks, row, blockId)
      } else {
        const code = getRecordCode(row)
        if (code) {
          const inserted = insertBlockForRow(state.blocks, row)
          const newBlock = inserted.find(b => b.code === code)
          if (newBlock) {
            nextBlocks = inserted
            nextMap.set(action.rowId, newBlock.id)
          }
        }
      }
      const nextMdContent = serializeKnowledgeBlocks(nextBlocks)
      return {
        ...state,
        frameworkRows: nextRows,
        blocks: nextBlocks,
        blockMap: nextMap,
        mdContent: nextMdContent,
      }
    }
    case 'ADD_ROW': {
      const newRow: EditorRow = {
        rowId: generateId(),
        知识点编号: '',
        知识点名称: '',
      }
      const nextRows = [...state.frameworkRows, newRow]
      return { ...state, frameworkRows: nextRows }
    }
    case 'INSERT_ROW_AFTER': {
      const index = state.frameworkRows.findIndex(r => r.rowId === action.rowId)
      if (index === -1) return state
      const anchor = state.frameworkRows[index]
      const anchorCode = getRecordCode(anchor)
      const newCode = anchorCode ? (incrementCodeSibling(anchorCode) ?? '') : ''
      const newRow: EditorRow = {
        rowId: generateId(),
        知识点编号: newCode,
        知识点名称: '',
      }
      const nextRows = [
        ...state.frameworkRows.slice(0, index + 1),
        newRow,
        ...state.frameworkRows.slice(index + 1),
      ]
      let nextBlocks = state.blocks
      const nextMap = new Map(state.blockMap)
      if (newCode) {
        const inserted = insertBlockForRow(state.blocks, newRow)
        const newBlock = inserted.find(b => b.code === newCode)
        if (newBlock) {
          nextBlocks = inserted
          nextMap.set(newRow.rowId, newBlock.id)
        }
      }
      const nextMdContent = serializeKnowledgeBlocks(nextBlocks)
      return {
        ...state,
        frameworkRows: nextRows,
        blocks: nextBlocks,
        blockMap: nextMap,
        mdContent: nextMdContent,
      }
    }
    case 'DELETE_ROW': {
      const nextRows = state.frameworkRows.filter(r => r.rowId !== action.rowId)
      const blockId = state.blockMap.get(action.rowId)
      let nextBlocks = state.blocks
      if (blockId) {
        nextBlocks = deleteBlockForRow(state.blocks, blockId)
      }
      const nextMap = new Map(state.blockMap)
      nextMap.delete(action.rowId)
      const nextMdContent = serializeKnowledgeBlocks(nextBlocks)
      return {
        ...state,
        frameworkRows: nextRows,
        blocks: nextBlocks,
        blockMap: nextMap,
        mdContent: nextMdContent,
      }
    }
    case 'SET_MD_CONTENT': {
      const nextBlocks = parseKnowledgeBlocks(action.content)
      const nextMap = buildBlockMap(state.frameworkRows, nextBlocks)
      return { ...state, blocks: nextBlocks, blockMap: nextMap, mdContent: action.content }
    }
    case 'BATCH_REPLACE_HEADINGS': {
      const sourcePrefix = '#'.repeat(action.sourceLevel)
      const targetPrefix = '#'.repeat(action.targetLevel)
      const nextLines = state.mdContent.split('\n').map(line => {
        if (!line.startsWith(`${sourcePrefix} `)) return line
        const match = line.match(
          new RegExp(`^${sourcePrefix}\\s+(?:知识点\\s+)?(\\d+(?:\\.\\d+)*)`)
        )
        if (!match) return line
        const code = match[1]
        if (action.scope !== 'all' && !action.scope.includes(code)) return line
        return `${targetPrefix} ${line.slice(sourcePrefix.length + 1)}`
      })
      const nextMdContent = nextLines.join('\n')
      const nextBlocks = parseKnowledgeBlocks(nextMdContent)
      const nextMap = buildBlockMap(state.frameworkRows, nextBlocks)
      return { ...state, blocks: nextBlocks, blockMap: nextMap, mdContent: nextMdContent }
    }
    case 'LOAD_DRAFT': {
      const nextBlocks = parseKnowledgeBlocks(action.mdContent)
      const nextMap = buildBlockMap(action.frameworkRows, nextBlocks)
      return {
        ...state,
        frameworkRows: action.frameworkRows,
        blocks: nextBlocks,
        blockMap: nextMap,
        mdContent: action.mdContent,
      }
    }
    case 'RESET': {
      const frameworkRows = action.originalRows.map(row => ({ ...row, rowId: generateId() }))
      const mdContent = action.originalMd
      const blocks = parseKnowledgeBlocks(mdContent)
      const blockMap = buildBlockMap(frameworkRows, blocks)
      return { frameworkRows, blocks, blockMap, mdContent }
    }
    default:
      return state
  }
}

export function useExpansionEditor(options: UseExpansionEditorOptions): UseExpansionEditorReturn {
  const {
    textbookId,
    originalRows,
    originalMd,
    onValidate,
    onResetValidation,
    originalFrameworkFile,
    originalContentFile,
  } = options

  const draftKey = `${DRAFT_KEY_PREFIX}-${textbookId}`
  const [editMode, setEditMode] = useState(false)
  const [dataState, dispatch] = useReducer(
    reduceDataState,
    { originalRows, originalMd },
    ({ originalRows, originalMd }: { originalRows: XlsxPreviewRow[]; originalMd: string }) =>
      initDataState(originalRows, originalMd)
  )
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    dispatch({ type: 'RESET', originalRows, originalMd })
  }, [originalRows, originalMd])
  const frameworkFileName = originalFrameworkFile?.name ?? 'framework.xlsx'
  const contentFileName = originalContentFile?.name ?? 'content.md'

  const markChanged = useCallback(() => {
    setHasUnsavedChanges(true)
    onResetValidation()
  }, [onResetValidation])

  const enterEditMode = useCallback(() => {
    setEditMode(true)
  }, [])

  const exitEditMode = useCallback(() => {
    setEditMode(false)
  }, [])

  const updateRow = useCallback(
    (rowId: string, patch: Partial<XlsxPreviewRow>) => {
      dispatch({ type: 'UPDATE_ROW', rowId, patch })
      markChanged()
    },
    [markChanged]
  )

  const addRow = useCallback(() => {
    dispatch({ type: 'ADD_ROW' })
    markChanged()
  }, [markChanged])

  const insertRowAfter = useCallback(
    (rowId: string) => {
      dispatch({ type: 'INSERT_ROW_AFTER', rowId })
      markChanged()
    },
    [markChanged]
  )

  const deleteRow = useCallback(
    (rowId: string) => {
      dispatch({ type: 'DELETE_ROW', rowId })
      setSelectedRowIds(prevIds => prevIds.filter(id => id !== rowId))
      markChanged()
    },
    [markChanged]
  )

  const updateMdContent = useCallback(
    (content: string) => {
      dispatch({ type: 'SET_MD_CONTENT', content })
      markChanged()
    },
    [markChanged]
  )

  const batchReplaceHeadings = useCallback(
    (sourceLevel: number, targetLevel: number, scope: 'all' | string[]) => {
      dispatch({ type: 'BATCH_REPLACE_HEADINGS', sourceLevel, targetLevel, scope })
      markChanged()
    },
    [markChanged]
  )

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    )
  }, [])

  const revalidateFiles = useCallback(async () => {
    const frameworkFile = makeXlsxFile(dataState.frameworkRows.map(toXlsxRow), frameworkFileName)
    const contentFile = makeMdFile(dataState.mdContent, contentFileName)
    await onValidate(frameworkFile, contentFile)
  }, [dataState.frameworkRows, dataState.mdContent, frameworkFileName, contentFileName, onValidate])

  const saveDraft = useCallback(() => {
    const draft = {
      textbookId,
      frameworkRows: dataState.frameworkRows,
      mdContent: dataState.mdContent,
    }
    sessionStorage.setItem(draftKey, JSON.stringify(draft))
  }, [textbookId, dataState.frameworkRows, dataState.mdContent, draftKey])

  const loadDraft = useCallback((): boolean => {
    const raw = sessionStorage.getItem(draftKey)
    if (!raw) return false
    try {
      const draft = JSON.parse(raw) as {
        frameworkRows?: EditorRow[]
        mdContent?: string
      }
      if (draft.frameworkRows && draft.mdContent !== undefined) {
        dispatch({
          type: 'LOAD_DRAFT',
          frameworkRows: draft.frameworkRows,
          mdContent: draft.mdContent,
        })
        setHasUnsavedChanges(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [draftKey])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(draftKey)
  }, [draftKey])

  const mdSyncWarnings = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of dataState.frameworkRows) {
      const code = getRecordCode(row)
      if (!code) continue
      const hasBlock = dataState.blocks.some(b => b.code === code)
      if (!hasBlock) {
        map.set(row.rowId, '无对应 Markdown 内容块')
      }
    }
    return map
  }, [dataState.frameworkRows, dataState.blocks])

  return useMemo(
    () => ({
      editMode,
      frameworkRows: dataState.frameworkRows,
      mdContent: dataState.mdContent,
      selectedRowIds,
      hasUnsavedChanges,
      enterEditMode,
      exitEditMode,
      updateRow,
      addRow,
      deleteRow,
      insertRowAfter,
      updateMdContent,
      batchReplaceHeadings,
      toggleRowSelection,
      revalidateFiles,
      saveDraft,
      loadDraft,
      clearDraft,
      mdSyncWarnings,
    }),
    [
      editMode,
      dataState.frameworkRows,
      dataState.mdContent,
      selectedRowIds,
      hasUnsavedChanges,
      enterEditMode,
      exitEditMode,
      updateRow,
      addRow,
      deleteRow,
      insertRowAfter,
      updateMdContent,
      batchReplaceHeadings,
      toggleRowSelection,
      revalidateFiles,
      saveDraft,
      loadDraft,
      clearDraft,
      mdSyncWarnings,
    ]
  )
}

export default useExpansionEditor
