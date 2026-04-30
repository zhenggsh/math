# Spec: File Parser

## Overview

文件解析能力，负责解析知识库框架文件（Excel/CSV），提取知识点层级结构和元数据。

## Requirements

### R1: Excel 文件解析

**R1.1** 系统必须支持解析 `.xlsx` 格式的 Excel 文件

**R1.2** 解析器必须识别以下列（按优先级匹配，支持中英文列名）：

| 优先级 | 中文列名 | 英文列名 | 必需 | 说明 |
|--------|----------|----------|------|------|
| 1 | 一级知识点 | level1, level_1 | 是 | 大章节名称 |
| 2 | 二级知识点 | level2, level_2 | 否 | 小节名称 |
| 3 | 三级知识点 | level3, level_3 | 否 | 具体知识点 |
| 4 | 定义 | definition | 否 | 知识点定义描述 |
| 5 | 特性/运算方式 | characteristics, features | 否 | 特性或运算方法 |
| 6 | 知识点编号 | code, id, number | 否 | 唯一标识符 |
| 7 | 重要性级别 | importance, importanceLevel, level | 否 | A/B/C 分类 |

**R1.3** 解析器必须处理多级知识点结构：
- 一级知识点存在时，作为父级
- 二级知识点继承最近的一级知识点
- 三级知识点继承最近的二级知识点
- 生成知识点编号（如未提供）：`{一级序号}.{二级序号}.{三级序号}`

### R2: CSV 文件解析

**R2.1** 系统必须支持解析 `.csv` 格式的文本文件

**R2.2** 解析器必须支持以下编码格式（按优先级尝试）：
1. UTF-8 with BOM
2. UTF-8
3. GBK/GB2312（中文 Windows 常见）

**R2.3** 解析器必须处理 CSV 列名映射，规则与 Excel 相同（R1.2）

### R3: 知识点数据提取

**R3.1** 解析器必须提取以下知识点字段：

```typescript
interface ParsedKnowledgePoint {
  code: string;              // 知识点编号（如：1.1.1）
  level1: string;            // 一级知识点
  level2?: string;           // 二级知识点
  level3?: string;           // 三级知识点
  definition?: string;       // 定义
  characteristics?: string;  // 特性/运算方式
  importanceLevel: 'A' | 'B' | 'C';  // 重要性级别
}
```

**R3.2** 重要性级别默认值：
- 如果未指定或无法识别，默认为 `'C'`
- 有效值：`'A'`（必须掌握）、`'B'`（重要）、`'C'`（补充）
- 大小写不敏感，统一转为大写存储

**R3.3** 数据清洗规则：
- 去除首尾空白字符
- 统一换行符为 `\n`
- 合并连续空行（保留单空行）

### R4: Markdown 文件读取

**R4.1** 系统必须支持读取 `.md` 格式的 Markdown 文件

**R4.2** 读取结果应包含原始内容，不进行解析处理（由前端渲染）

**R4.3** 系统必须验证 Markdown 文件编码为 UTF-8

### R5: 错误处理

**R5.1** 解析器必须提供清晰的错误信息：

| 错误类型 | 错误码 | 说明 |
|----------|--------|------|
| FILE_NOT_FOUND | E001 | 文件不存在 |
| FILE_TOO_LARGE | E002 | 文件超过大小限制（10MB）|
| INVALID_FORMAT | E003 | 文件格式不支持 |
| MISSING_REQUIRED_COLUMN | E004 | 缺少必需列（一级知识点）|
| PARSE_ERROR | E005 | 解析过程中发生错误 |
| ENCODING_ERROR | E006 | 文件编码无法识别 |

**R5.2** 解析错误时，必须返回：
- 错误码
- 错误消息（中英文）
- 行号（如果适用）
- 原始数据片段（如果适用）

## Interface

### ParserService

```typescript
interface ParseResult {
  success: boolean;
  data?: ParsedKnowledgePoint[];
  error?: ParseError;
  stats: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
  };
}

interface ParseError {
  code: string;
  message: string;
  row?: number;
  column?: string;
  sample?: string;
}

class ParserService {
  /**
   * 解析框架文件（Excel 或 CSV）
   * @param filePath 文件路径
   * @returns 解析结果
   */
  parseFramework(filePath: string): Promise<ParseResult>;

  /**
   * 读取详情文件（Markdown）
   * @param filePath 文件路径
   * @returns 文件内容
   */
  readContent(filePath: string): Promise<string>;

  /**
   * 检测文件类型
   * @param filePath 文件路径
   * @returns 文件类型：xlsx | csv | md | unknown
   */
  detectFileType(filePath: string): 'xlsx' | 'csv' | 'md' | 'unknown';
}
```

## Data Examples

### 输入：CSV 文件

```csv
一级知识点,二级知识点,三级知识点,定义,特性/运算方式,知识点编号,重要性级别
1,集合与常用逻辑用语,,高中数学的基础语言工具,,,A
1.1,,集合的概念与表示,研究对象的总体,确定性、互异性、无序性,,A
1.1.1,,,集合的含义,元素三特性,1.1.1,A
1.1.2,,,集合的表示方法,列举法、描述法,1.1.2,A
```

### 输出：解析结果

```json
{
  "success": true,
  "data": [
    {
      "code": "1",
      "level1": "集合与常用逻辑用语",
      "level2": null,
      "level3": null,
      "definition": "高中数学的基础语言工具",
      "characteristics": null,
      "importanceLevel": "A"
    },
    {
      "code": "1.1",
      "level1": "集合与常用逻辑用语",
      "level2": "集合的概念与表示",
      "level3": null,
      "definition": "研究对象的总体",
      "characteristics": "确定性、互异性、无序性",
      "importanceLevel": "A"
    },
    {
      "code": "1.1.1",
      "level1": "集合与常用逻辑用语",
      "level2": "集合的概念与表示",
      "level3": "集合的含义",
      "definition": "元素三特性",
      "characteristics": null,
      "importanceLevel": "A"
    }
  ],
  "stats": {
    "totalRows": 4,
    "validRows": 4,
    "skippedRows": 0
  }
}
```

## Test Cases

### T1: Excel 解析测试

**T1.1** 正常解析 `.xlsx` 文件，验证所有列正确提取

**T1.2** 测试缺少可选列（二级、三级知识点），应正常解析

**T1.3** 测试缺少必需列（一级知识点），应返回错误

**T1.4** 测试大文件（> 1000 行），应在 5 秒内完成

### T2: CSV 解析测试

**T2.1** 正常解析 UTF-8 CSV 文件

**T2.2** 正常解析 GBK 编码 CSV 文件

**T2.3** 测试包含特殊字符（逗号、引号）的 CSV 文件

### T3: 数据验证测试

**T3.1** 测试自动生成知识点编号逻辑

**T3.2** 测试重要性级别默认值（C）

**T3.3** 测试数据清洗（去除空白、统一换行符）

### T4: 错误处理测试

**T4.1** 测试不存在的文件，返回 FILE_NOT_FOUND

**T4.2** 测试空文件，返回 PARSE_ERROR

**T4.3** 测试损坏的 Excel 文件，返回 PARSE_ERROR

---

*Version: 1.0*
*Capability: file-parser*
