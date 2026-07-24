import { describe, it, expect } from 'vitest'
import { findMdLineByCode } from '../mdLineLocator'

const MD = [
  '# 数学必修一', // 1
  '## 1 集合', // 2
  '### 1.1 集合的概念', // 3
  '#### 知识点 1.1.1：集合的含义', // 4
  '内容一', // 5
  '#### 知识点 1.1.10：集合的其他', // 6
  '内容十', // 7
  '### 1.10 另一个二级', // 8
  '#### 2.4.1 任意角的概念', // 9
  '内容', // 10
].join('\n')

describe('findMdLineByCode', () => {
  it('精确匹配三级标题（含 知识点 前缀与全角冒号）', () => {
    expect(findMdLineByCode(MD, '1.1.1')).toBe(4)
  })

  it('编号 1.1.1 不误匹配 1.1.10（负向前瞻）', () => {
    expect(findMdLineByCode(MD, '1.1.1')).not.toBe(6)
  })

  it('编号 1.1 精确命中二级标题而非 1.10', () => {
    expect(findMdLineByCode(MD, '1.1')).toBe(3)
  })

  it('一级编号退化匹配到后代编号的第一行', () => {
    expect(findMdLineByCode(MD, '2.4')).toBe(9)
  })

  it('无匹配返回 undefined', () => {
    expect(findMdLineByCode(MD, '9.9.9')).toBeUndefined()
  })

  it('空文本返回 undefined', () => {
    expect(findMdLineByCode('', '1.1.1')).toBeUndefined()
  })

  it('无 # 标题前缀的行不匹配', () => {
    expect(findMdLineByCode('1.1.1 不是标题', '1.1.1')).toBeUndefined()
  })

  it('空编号返回 undefined', () => {
    expect(findMdLineByCode(MD, '')).toBeUndefined()
  })
})
