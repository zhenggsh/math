import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { message } from 'antd'
import type { ExpansionDraft } from '../../../types/textbook.types'
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
  insertRowBefore: (rowId: string) => void
  updateMdContent: (content: string) => void
  batchReplaceHeadings: (sourceLevel: number, targetLevel: number, scope: 'all' | string[]) => void
  toggleRowSelection: (rowId: string) => void
  revalidateFiles: () => Promise<void>
  editedFrameworkFile: File
  editedContentFile: File
  saveDraft: () => Promise<boolean>
  loadDraft: (frameworkFile: File | null, contentFile: File | null) => Promise<boolean>
  clearDraft: () => void
  mdSyncWarnings: Map<string, string>
}

const DRAFT_KEY_PREFIX = 'math-tong-expansion-draft'

async function fingerprintFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

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
  selectedRowIds: string[]
  hasUnsavedChanges: boolean
}

function initDataState(originalRows: XlsxPreviewRow[], originalMd: string): DataState {
  const frameworkRows = originalRows.map(row => ({ ...row, rowId: generateId() }))
  const mdContent = originalMd
  const blocks = parseKnowledgeBlocks(mdContent)
  const blockMap = buildBlockMap(frameworkRows, blocks)
  return {
    frameworkRows,
    blocks,
    blockMap,
    mdContent,
    selectedRowIds: [],
    hasUnsavedChanges: false,
  }
}

type Action =
  | { type: 'UPDATE_ROW'; rowId: string; patch: Partial<XlsxPreviewRow> }
  | { type: 'ADD_ROW' }
  | { type: 'INSERT_ROW_AFTER'; rowId: string }
  | { type: 'INSERT_ROW_BEFORE'; rowId: string }
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
  | { type: 'TOGGLE_ROW_SELECTION'; rowId: string }
  | { type: 'CLEAR_SELECTED_ROW_IDS' }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; value: boolean }

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
    case 'INSERT_ROW_BEFORE': {
      const index = state.frameworkRows.findIndex(r => r.rowId === action.rowId)
      if (index === -1) return state
      const newRow: EditorRow = {
        rowId: generateId(),
        知识点编号: '',
        知识点名称: '',
      }
      const nextRows = [
        ...state.frameworkRows.slice(0, index),
        newRow,
        ...state.frameworkRows.slice(index),
      ]
      const nextMdContent = serializeKnowledgeBlocks(state.blocks)
      return {
        ...state,
        frameworkRows: nextRows,
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
        selectedRowIds: state.selectedRowIds.filter(id => id !== action.rowId),
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
        selectedRowIds: [],
        hasUnsavedChanges: true,
      }
    }
    case 'RESET': {
      const frameworkRows = action.originalRows.map(row => ({ ...row, rowId: generateId() }))
      const mdContent = action.originalMd
      const blocks = parseKnowledgeBlocks(mdContent)
      const blockMap = buildBlockMap(frameworkRows, blocks)
      return {
        frameworkRows,
        blocks,
        blockMap,
        mdContent,
        selectedRowIds: [],
        hasUnsavedChanges: false,
      }
    }
    case 'TOGGLE_ROW_SELECTION': {
      const nextIds = state.selectedRowIds.includes(action.rowId)
        ? state.selectedRowIds.filter(id => id !== action.rowId)
        : [...state.selectedRowIds, action.rowId]
      return { ...state, selectedRowIds: nextIds }
    }
    case 'CLEAR_SELECTED_ROW_IDS': {
      return { ...state, selectedRowIds: [] }
    }
    case 'SET_HAS_UNSAVED_CHANGES': {
      return { ...state, hasUnsavedChanges: action.value }
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

  useEffect(() => {
    if (editMode) return
    dispatch({ type: 'RESET', originalRows, originalMd })
  }, [originalRows, originalMd, editMode])
  const frameworkFileName = originalFrameworkFile?.name ?? 'framework.xlsx'
  const contentFileName = originalContentFile?.name ?? 'content.md'

  const markChanged = useCallback(() => {
    dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', value: true })
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

  const insertRowBefore = useCallback(
    (rowId: string) => {
      dispatch({ type: 'INSERT_ROW_BEFORE', rowId })
      markChanged()
    },
    [markChanged]
  )

  const deleteRow = useCallback(
    (rowId: string) => {
      dispatch({ type: 'DELETE_ROW', rowId })
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
    dispatch({ type: 'TOGGLE_ROW_SELECTION', rowId })
  }, [])

  const editedFrameworkFile = useMemo(
    () => makeXlsxFile(dataState.frameworkRows.map(toXlsxRow), frameworkFileName),
    [dataState.frameworkRows, frameworkFileName]
  )
  const editedContentFile = useMemo(
    () => makeMdFile(dataState.mdContent, contentFileName),
    [dataState.mdContent, contentFileName]
  )

  const revalidateFiles = useCallback(async () => {
    await onValidate(editedFrameworkFile, editedContentFile)
  }, [editedFrameworkFile, editedContentFile, onValidate])

  const saveDraft = useCallback(async (): Promise<boolean> => {
    try {
      const [frameworkContent, contentContent, frameworkFingerprint, contentFingerprint] =
        await Promise.all([
          originalFrameworkFile
            ? readFileAsDataUrl(originalFrameworkFile)
            : Promise.resolve(undefined),
          originalContentFile ? readFileAsDataUrl(originalContentFile) : Promise.resolve(undefined),
          originalFrameworkFile
            ? fingerprintFile(originalFrameworkFile)
            : Promise.resolve(undefined),
          originalContentFile ? fingerprintFile(originalContentFile) : Promise.resolve(undefined),
        ])
      const draft: ExpansionDraft = {
        textbookId,
        frameworkFileName: originalFrameworkFile?.name,
        frameworkFileContent: frameworkContent,
        contentFileName: originalContentFile?.name,
        contentFileContent: contentContent,
        editedFrameworkRows: dataState.frameworkRows,
        editedMdContent: dataState.mdContent,
        originalFrameworkFingerprint: frameworkFingerprint,
        originalContentFingerprint: contentFingerprint,
      }
      sessionStorage.setItem(draftKey, JSON.stringify(draft))
      return true
    } catch {
      message.error('保存草稿失败')
      return false
    }
  }, [
    textbookId,
    dataState.frameworkRows,
    dataState.mdContent,
    draftKey,
    originalFrameworkFile,
    originalContentFile,
  ])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(draftKey)
  }, [draftKey])

  const loadDraft = useCallback(
    async (frameworkFile: File | null, contentFile: File | null): Promise<boolean> => {
      const raw = sessionStorage.getItem(draftKey)
      if (!raw) return false
      try {
        const draft = JSON.parse(raw) as ExpansionDraft
        let currentFrameworkFingerprint: string | undefined
        let currentContentFingerprint: string | undefined
        if (frameworkFile || contentFile) {
          if (frameworkFile) {
            currentFrameworkFingerprint = await fingerprintFile(frameworkFile)
          }
          if (contentFile) {
            currentContentFingerprint = await fingerprintFile(contentFile)
          }
        }
        if (
          (draft.originalFrameworkFingerprint &&
            currentFrameworkFingerprint &&
            draft.originalFrameworkFingerprint !== currentFrameworkFingerprint) ||
          (draft.originalContentFingerprint &&
            currentContentFingerprint &&
            draft.originalContentFingerprint !== currentContentFingerprint)
        ) {
          clearDraft()
          return false
        }
        if (draft.editedFrameworkRows && draft.editedMdContent !== undefined) {
          dispatch({
            type: 'LOAD_DRAFT',
            frameworkRows: draft.editedFrameworkRows,
            mdContent: draft.editedMdContent,
          })
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [draftKey, clearDraft]
  )

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
      selectedRowIds: dataState.selectedRowIds,
      hasUnsavedChanges: dataState.hasUnsavedChanges,
      enterEditMode,
      exitEditMode,
      updateRow,
      addRow,
      deleteRow,
      insertRowAfter,
      insertRowBefore,
      updateMdContent,
      batchReplaceHeadings,
      toggleRowSelection,
      revalidateFiles,
      editedFrameworkFile,
      editedContentFile,
      saveDraft,
      loadDraft,
      clearDraft,
      mdSyncWarnings,
    }),
    [
      editMode,
      dataState.frameworkRows,
      dataState.mdContent,
      dataState.selectedRowIds,
      dataState.hasUnsavedChanges,
      enterEditMode,
      exitEditMode,
      updateRow,
      addRow,
      deleteRow,
      insertRowAfter,
      insertRowBefore,
      updateMdContent,
      batchReplaceHeadings,
      toggleRowSelection,
      revalidateFiles,
      editedFrameworkFile,
      editedContentFile,
      saveDraft,
      loadDraft,
      clearDraft,
      mdSyncWarnings,
    ]
  )
}

export default useExpansionEditor
