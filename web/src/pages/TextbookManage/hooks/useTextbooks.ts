import { useState, useEffect, useCallback } from 'react'
import {
  getTextbooks,
  syncAllTextbooks,
  refreshTextbook,
  deleteTextbook,
  uploadTextbook,
} from '../../../services/textbook.service'
import type { Textbook, SyncResult, UploadResult } from '../../../types/textbook.types'

interface UseTextbooksReturn {
  // 数据
  textbooks: Textbook[]
  loading: boolean
  error: string | null

  // 操作方法
  fetchTextbooks: () => Promise<void>
  syncAll: () => Promise<SyncResult | null>
  refresh: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  upload: (
    frameworkFile: File,
    contentFile: File | null,
    baseName: string
  ) => Promise<UploadResult | null>
}

export const useTextbooks = (): UseTextbooksReturn => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取教材列表
  const fetchTextbooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTextbooks()
      setTextbooks(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取教材列表失败'
      setError(message)
      console.error('Failed to fetch textbooks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 同步所有教材
  const syncAll = useCallback(async (): Promise<SyncResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await syncAllTextbooks()
      // 同步完成后刷新列表
      await fetchTextbooks()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '同步教材失败'
      setError(message)
      console.error('Failed to sync textbooks:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchTextbooks])

  // 刷新指定教材
  const refresh = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        await refreshTextbook(id)
        // 刷新完成后更新列表
        await fetchTextbooks()
      } catch (err) {
        const message = err instanceof Error ? err.message : '刷新教材失败'
        setError(message)
        console.error('Failed to refresh textbook:', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchTextbooks]
  )

  // 删除教材
  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await deleteTextbook(id)
      // 删除完成后更新列表
      setTextbooks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除教材失败'
      setError(message)
      console.error('Failed to delete textbook:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 上传教材
  const upload = useCallback(
    async (
      frameworkFile: File,
      contentFile: File | null,
      baseName: string
    ): Promise<UploadResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await uploadTextbook(frameworkFile, contentFile, baseName)
        // 上传完成后刷新列表
        await fetchTextbooks()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : '上传教材失败'
        setError(message)
        console.error('Failed to upload textbook:', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchTextbooks]
  )

  // 初始加载
  useEffect(() => {
    void fetchTextbooks()
  }, [fetchTextbooks])

  return {
    textbooks,
    loading,
    error,
    fetchTextbooks,
    syncAll,
    refresh,
    remove,
    upload,
  }
}
