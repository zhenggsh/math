import { useState, useCallback, useRef, useEffect } from 'react'

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
  const translateRef = useRef<PanState>(translate)
  translateRef.current = translate

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

  const onMouseDown = useCallback((e: React.MouseEvent): void => {
    if (e.button !== 1) return
    e.preventDefault()
    setIsPanning(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      translateX: translateRef.current.x,
      translateY: translateRef.current.y,
    }
  }, [])

  useEffect(() => {
    if (!isPanning || !dragStart.current) return

    const handleMouseMove = (e: MouseEvent): void => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const newX = dragStart.current.translateX + dx
      const newY = dragStart.current.translateY + dy
      setTranslate(constrainTranslate(newX, newY))
    }

    const handleMouseUp = (): void => {
      setIsPanning(false)
      dragStart.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning, constrainTranslate])

  const setTranslateWrapped = useCallback((newTranslate: PanState): void => {
    setTranslate(constrainTranslate(newTranslate.x, newTranslate.y))
  }, [constrainTranslate])

  return {
    translate,
    isPanning,
    setTranslate: setTranslateWrapped,
    handlers: { onMouseDown },
  }
}
