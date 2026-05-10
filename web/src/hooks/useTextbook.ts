import { useContext } from 'react'
import { TextbookContext, type TextbookContextType } from '../contexts/TextbookContext'

export const useTextbook = (): TextbookContextType => {
  const context = useContext(TextbookContext)
  if (context === undefined) {
    throw new Error('useTextbook must be used within a TextbookProvider')
  }
  return context
}
