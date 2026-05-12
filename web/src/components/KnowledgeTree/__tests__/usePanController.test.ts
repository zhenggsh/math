import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanController } from '../usePanController'

describe('usePanController', () => {
  it('returns initial translate state', () => {
    const { result } = renderHook(() => usePanController({
      containerWidth: 800,
      containerHeight: 600,
      contentWidth: 1000,
      contentHeight: 800,
    }))
    expect(result.current.translate).toEqual({ x: 20, y: 20 })
    expect(result.current.isPanning).toBe(false)
    expect(typeof result.current.setTranslate).toBe('function')
  })

  it('updates translate on middle-click drag', () => {
    const { result } = renderHook(() => usePanController({
      containerWidth: 800,
      containerHeight: 600,
      contentWidth: 1000,
      contentHeight: 800,
    }))

    const mockEvent = {
      button: 1,
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent

    act(() => {
      result.current.handlers.onMouseDown(mockEvent)
    })
    expect(result.current.isPanning).toBe(true)

    const moveEvent = {
      clientX: 150,
      clientY: 120,
    } as unknown as MouseEvent

    act(() => {
      result.current.handlers.onMouseMove(moveEvent)
    })
    expect(result.current.translate.x).toBe(70) // 20 + (150-100)
    expect(result.current.translate.y).toBe(40) // 20 + (120-100)
  })
})
