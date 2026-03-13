## Context

知识库管理是数学通系统的核心，需要处理文件上传、解析、展示。参考 project_target.md 第 14-22 行和 AGENTS.md 知识库文件规范。

依赖变更：setup-database-schema（KnowledgePoint 模型）, implement-user-management（教师权限）

## Goals / Non-Goals

**Goals:**
- 支持 xlsx/csv 解析为知识点树
- 支持 md 文件关联
- 实现文件管理界面
- 实现刷新机制

**Non-Goals:**
- 实时文件监控（使用手动刷新）
- 版本控制（只保留最新版本）

## Decisions

### Decision: 使用 xlsx 库解析 Excel
**Rationale**: 最流行的 Node.js Excel 解析库，支持流式读取。

### Decision: 文件存储在 iksm/ 目录
**Rationale**: 项目规范要求，便于版本控制和备份。

### Decision: 文件名关联（math01.xlsx ↔ math01.md）
**Rationale**: 项目规范定义，简单明确。

### Decision: 软删除知识记录
**Rationale**: 保留学习历史，删除文件只标记知识点不可用。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 大文件解析内存溢出 | 使用流式解析，限制文件大小（< 10MB）|
| 文件编码问题 | 强制 UTF-8，检测 BOM |

## Migration Plan

无需迁移。

## Open Questions

- 是否支持多文件批量上传？（建议：v2 支持）
