import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ValidationRulesPanel } from '../components/ValidationRulesPanel'

describe('ValidationRulesPanel', () => {
  it('renders xlsx and md validation rules', () => {
    render(<ValidationRulesPanel />)

    expect(screen.getByText(/框架文件.*xlsx.*校验规范/)).toBeInTheDocument()
    expect(screen.getByText(/内容文件.*md.*校验规范/)).toBeInTheDocument()
    expect(screen.getByText(/必须包含列/)).toBeInTheDocument()
    expect(screen.getByText(/文件不能为空/)).toBeInTheDocument()
  })
})
