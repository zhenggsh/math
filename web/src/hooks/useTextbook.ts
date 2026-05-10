import { useContext } from 'react'
import { TextbookContext } from '../contexts/TextbookContext'

export const useTextbook = () => {
  const context = useContext(TextbookContext)
  if (context === undefined) {
    throw new Error('useTextbook must be used within a TextbookProvider')
  }
  return context
}
