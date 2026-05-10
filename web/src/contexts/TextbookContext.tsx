import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { Textbook } from '../types/textbook.types'
import { getTextbooks } from '../services/textbook.service'
import { getToken } from '../services/auth.service'

// eslint-disable-next-line react-refresh/only-export-components
export const TextbookContext = createContext<TextbookContextType | undefined>(undefined)

const STORAGE_KEY = 'mathtong:selected-textbooks'

export interface TextbookContextType {
  selectedTextbookIds: string[]
  textbooks: Textbook[]
  isLoading: boolean
  selectTextbook: (id: string) => void
  deselectTextbook: (id: string) => void
  selectMultiple: (ids: string[]) => void
  clearSelection: () => void
}

interface TextbookProviderProps {
  children: React.ReactNode
}

export const TextbookProvider: React.FC<TextbookProviderProps> = ({ children }) => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTextbookIds, setSelectedTextbookIds] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const loadTextbooks = async (): Promise<void> => {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const data = await getTextbooks()
        setTextbooks(data)

        const validIds = data.map(t => t.id)
        const raw = localStorage.getItem(STORAGE_KEY)

        if (raw === null) {
          if (validIds.length > 0) {
            setSelectedTextbookIds([validIds[0]])
          }
        } else {
          try {
            const parsed = JSON.parse(raw) as unknown
            if (Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')) {
              if (parsed.length === 0) {
                setSelectedTextbookIds([])
              } else {
                const filtered = parsed.filter(id => validIds.includes(id))
                if (filtered.length > 0) {
                  setSelectedTextbookIds(filtered)
                } else if (validIds.length > 0) {
                  setSelectedTextbookIds([validIds[0]])
                }
              }
            } else if (validIds.length > 0) {
              setSelectedTextbookIds([validIds[0]])
            }
          } catch {
            if (validIds.length > 0) {
              setSelectedTextbookIds([validIds[0]])
            }
          }
        }

        setIsHydrated(true)
      } catch {
        // API failed - leave empty, don't crash
      } finally {
        setIsLoading(false)
      }
    }

    void loadTextbooks()
  }, [])

  const selectTextbook = useCallback((id: string): void => {
    setSelectedTextbookIds(prev => {
      if (prev.includes(id)) {
        return prev
      }
      return [...prev, id]
    })
  }, [])

  const deselectTextbook = useCallback((id: string): void => {
    setSelectedTextbookIds(prev => prev.filter(existingId => existingId !== id))
  }, [])

  const selectMultiple = useCallback((ids: string[]): void => {
    setSelectedTextbookIds(ids)
  }, [])

  const clearSelection = useCallback((): void => {
    setSelectedTextbookIds([])
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedTextbookIds))
    }
  }, [selectedTextbookIds, isHydrated])

  const value: TextbookContextType = useMemo(
    () => ({
      selectedTextbookIds,
      textbooks,
      isLoading,
      selectTextbook,
      deselectTextbook,
      selectMultiple,
      clearSelection,
    }),
    [selectedTextbookIds, textbooks, isLoading, selectTextbook, deselectTextbook, selectMultiple, clearSelection]
  )

  return <TextbookContext.Provider value={value}>{children}</TextbookContext.Provider>
}
