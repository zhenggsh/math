import { useState, useCallback, useRef } from 'react'

interface PanState {
  x: number
  y: number
}

interface UsePanControllerOptions {
  containerWidth: number
  containerHeight: number
  contentWidth: number
  contentHeight: number
  minVisible?: number
}

interface UsePanControllerResult {
  translate: PanState
  isPanning: boolean
  setTranslate: (translate: PanState) => void
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

const MIN_VISIBLE_DEFAULT = 100

export const usePanController = ({
  containerWidth,
  containerHeight,
  contentWidth,
  contentHeight,
  minVisible = MIN_VISIBLE_DEFAULT,
}: UsePanControllerOptions): UsePanControllerResult => {
  const [translate, setTranslate] = useState<PanState>({ x: 20, y: 20 })
  const [isPanning, setIsPanning] = useState(false)
  const dragStart = useRef<{ x: number; y: number; translateX: number; translateY: number } | null>(null)

  const constrainTranslate = useCallback((x: number, y: number): PanState => {
    const minTranslateX = minVisible - contentWidth
    const maxTranslateX = containerWidth - minVisible
    const minTranslateY = minVisible - contentHeight
    const maxTranslateY = containerHeight - minVisible

    return {
      x: Math.max(minTranslateX, Math.min(maxTranslateX, x)),
      y: Math.max(minTranslateY, Math.min(maxTranslateY, y)),
    }
  }, [containerWidth, containerHeight, contentWidth, contentHeight, minVisible])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return // Only middle-click
    e.preventDefault()
    setIsPanning(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      translateX: translate.x,
      translateY: translate.y,
    }
  }, [translate])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const newX = dragStart.current.translateX + dx
    const newY = dragStart.current.translateY + dy
    setTranslate(constrainTranslate(newX, newY))
  }, [isPanning, constrainTranslate])

  const onMouseUp = useCallback(() => {
    setIsPanning(false)
    dragStart.current = null
  }, [])

  const onMouseLeave = useCallback(() => {
    setIsPanning(false)
    dragStart.current = null
  }, [])

  const setTranslateWrapped = useCallback((newTranslate: PanState) => {
    setTranslate(constrainTranslate(newTranslate.x, newTranslate.y))
  }, [constrainTranslate])

  return {
    translate,
    isPanning,
    setTranslate: setTranslateWrapped,
    handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave },
  }
}
