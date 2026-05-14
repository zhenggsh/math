## ADDED Requirements

### Requirement: 知识点内容导出

系统 SHALL 允许用户将当前查看的知识点内容导出为文件。

#### Scenario: 导出为 Markdown
- **GIVEN** 用户正在查看某个知识点的详情
- **WHEN** 用户点击"导出"按钮并选择"Markdown"
- **THEN** 系统 SHALL 下载一个 `.md` 文件
- **AND** 文件内容 SHALL 包含知识点概述（定义、特性、重要性级别）和原始 Markdown 内容
- **AND** 文件名格式为 `{code}-{level3标题}.md`，如一二级节点则为 `{code}-{level1标题}.md`

#### Scenario: 导出为 PDF
- **GIVEN** 用户正在查看某个知识点的详情
- **WHEN** 用户点击"导出"按钮并选择"PDF"
- **THEN** 系统 SHALL 生成并下载一个 `.pdf` 文件
- **AND** PDF SHALL 包含当前渲染视图的内容（包括公式、图表等）
- **AND** PDF 页面大小为 A4
- **AND** 文件名格式与 Markdown 导出一致

#### Scenario: 导出菜单展示
- **GIVEN** 内容区工具栏
- **THEN** "导出"按钮 SHALL 以下拉菜单形式展示
- **AND** 菜单选项 SHALL 包含：Markdown、PDF

#### Scenario: 导出前等待渲染完成
- **GIVEN** 用户点击导出 PDF
- **WHEN** 页面包含 Mermaid 图表或 KaTeX 公式
- **THEN** 系统 SHALL 等待异步渲染完成后再生成 PDF
- **AND** 若内容包含 Mermaid 图表，等待时间为 3 秒；否则等待 800ms
- **AND** 最大等待时间为 3 秒

## Types

```typescript
interface KnowledgeExportProps {
  content: string;
  overview: {
    code: string;
    title: string;
    definition?: string;
    characteristics?: string;
    importanceLevel: 'A' | 'B' | 'C';
  };
}

type ExportFormat = 'markdown' | 'pdf';
```

## UI Specifications

| 元素 | 规格 |
|-----|------|
| 导出按钮 | Ant Design `ExportOutlined` 图标 + "导出"文字 |
| 下拉菜单 | Ant Design `Dropdown` 组件 |
| 菜单项 | Markdown、PDF |
| 导出中状态 | 按钮显示 loading 图标，禁用点击 |

## Performance Requirements

- Markdown 导出生成时间 <= 100ms
- PDF 导出生成时间 <= 3s（包含渲染等待）
