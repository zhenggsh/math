import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanController } from '../usePanController'

describe('usePanController', () => {
  it('returns initial translate state', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )
    expect(result.current.translate).toEqual({ x: 20, y: 20 })
    expect(result.current.isPanning).toBe(false)
    expect(typeof result.current.setTranslate).toBe('function')
    expect(result.current.handlers).toHaveProperty('onMouseDown')
    expect(result.current.handlers).not.toHaveProperty('onMouseMove')
    expect(result.current.handlers).not.toHaveProperty('onMouseUp')
    expect(result.current.handlers).not.toHaveProperty('onMouseLeave')
  })

  it('updates translate on middle-click drag', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )

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

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }))
    })
    expect(result.current.translate.x).toBe(70) // 20 + (150-100)
    expect(result.current.translate.y).toBe(40) // 20 + (120-100)
  })

  it('constrains translate to boundaries', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        button: 1,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent)
    })

    // Drag far beyond max boundaries
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 2000, clientY: 2000 }))
    })
    expect(result.current.translate.x).toBe(700) // maxTranslateX = 800 - 100
    expect(result.current.translate.y).toBe(500) // maxTranslateY = 600 - 100

    // Drag far below min boundaries
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -2000, clientY: -2000 }))
    })
    expect(result.current.translate.x).toBe(-900) // minTranslateX = 100 - 1000
    expect(result.current.translate.y).toBe(-700) // minTranslateY = 100 - 800
  })

  it('ignores left and right click', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )

    const preventDefault = vi.fn()

    // Left click
    act(() => {
      result.current.handlers.onMouseDown({
        button: 0,
        clientX: 100,
        clientY: 100,
        preventDefault,
      } as unknown as React.MouseEvent)
    })
    expect(result.current.isPanning).toBe(false)
    expect(preventDefault).not.toHaveBeenCalled()

    // Right click
    act(() => {
      result.current.handlers.onMouseDown({
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault,
      } as unknown as React.MouseEvent)
    })
    expect(result.current.isPanning).toBe(false)
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('terminates pan on mouseup', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        button: 1,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent)
    })
    expect(result.current.isPanning).toBe(true)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(result.current.isPanning).toBe(false)

    // Further mousemove should not affect translate
    const beforeTranslate = result.current.translate
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 500 }))
    })
    expect(result.current.translate).toEqual(beforeTranslate)
  })

  it('applies constraints via setTranslate', () => {
    const { result } = renderHook(() =>
      usePanController({
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1000,
        contentHeight: 800,
      })
    )

    act(() => {
      result.current.setTranslate({ x: 5000, y: -5000 })
    })
    expect(result.current.translate.x).toBe(700)
    expect(result.current.translate.y).toBe(-700)

    act(() => {
      result.current.setTranslate({ x: -5000, y: 5000 })
    })
    expect(result.current.translate.x).toBe(-900)
    expect(result.current.translate.y).toBe(500)
  })
})
