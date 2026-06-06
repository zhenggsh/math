import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudyGoalTracker } from '../StudyGoalTracker'

describe('StudyGoalTracker', () => {
  const defaultProps = {
    studiedCount: 3,
    goalCount: 5,
    onGoalChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays progress with goal (X/Y format)', () => {
    render(<StudyGoalTracker {...defaultProps} />)

    expect(screen.getByText('今日已复习 3 / 5 个薄弱点')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('displays count without goal', () => {
    render(<StudyGoalTracker {...defaultProps} goalCount={0} />)

    expect(screen.getByText('今日已复习 3 个薄弱点')).toBeInTheDocument()
    expect(screen.queryByText(/今日已复习.*\/.*个薄弱点/)).not.toBeInTheDocument()
  })

  it('shows completion state when goal reached', () => {
    render(<StudyGoalTracker {...defaultProps} studiedCount={5} />)

    expect(screen.getByText('今日目标达成！继续保持')).toBeInTheDocument()
    expect(screen.queryByText(/今日已复习/)).not.toBeInTheDocument()
  })

  it('shows completion state when studied exceeds goal', () => {
    render(<StudyGoalTracker {...defaultProps} studiedCount={7} />)

    expect(screen.getByText('今日目标达成！继续保持')).toBeInTheDocument()
  })

  it('opens settings modal on button click', () => {
    render(<StudyGoalTracker {...defaultProps} />)

    const settingsButton = screen.getByRole('button', {
      name: '设定学习目标',
    })
    fireEvent.click(settingsButton)

    expect(screen.getByText('设定今日学习目标')).toBeInTheDocument()
    expect(screen.getByText('每日复习目标数量（1-20）：')).toBeInTheDocument()
  })

  it('calls onGoalChange with new value on save', async () => {
    render(<StudyGoalTracker {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: '设定学习目标' }))

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '8' } })

    await waitFor(() => {
      expect(input).toHaveValue('8')
    })

    fireEvent.click(screen.getByText('保 存'))

    await waitFor(() => {
      expect(defaultProps.onGoalChange).toHaveBeenCalledWith(8)
    })
  })

  it('does not call onGoalChange when cancel is clicked', () => {
    render(<StudyGoalTracker {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: '设定学习目标' }))

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '10' } })

    fireEvent.click(screen.getByText('取 消'))

    expect(defaultProps.onGoalChange).not.toHaveBeenCalled()
  })

  it('initializes modal with current goalCount', () => {
    render(<StudyGoalTracker {...defaultProps} goalCount={7} />)

    fireEvent.click(screen.getByRole('button', { name: '设定学习目标' }))

    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('7')
  })
})
