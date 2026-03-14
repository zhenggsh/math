---
name: project-rule
description: Code generation rules for 数学通 (Math Learning System). Apply when generating any code for this project.
license: MIT
metadata:
  author: kimi-code
  version: "1.0"
---

# 数学通 项目代码生成规则

> **Agent 必读**: 本文档是“代码风格与实现约束的唯一权威”（不覆盖工作流/原则/决策权）。开始编码前请先阅读本文档，了解技术约束和代码风格。
> 
> **相关文档**：[openspec/constitution.md](../../../openspec/constitution.md) - 项目宪法（核心原则、技术决策、开发工作流）

---

## 工作前检查清单

### 第一步：检查活跃变更

```bash
openspec list --json
```

- 如果有活跃变更 → 先阅读其 `proposal.md`、`design.md`、`tasks.md`
- 如果有多个变更 → 询问用户关注哪个

### 第二步：确认项目结构

- 前端: `web/src/`
- 后端: `server/src/`
- 数据库: `server/prisma/schema.prisma`

---

## 技术栈规范

### 前端

| 技术 | 版本 | 要求 |
|------|------|------|
| React | 18+ | 函数组件 + Hooks |
| TypeScript | 5+ | Strict 模式 |
| Vite | 5+ | 构建工具 |
| Vitest | 1+ | 单元测试框架，覆盖率 ≥ 80% |

### 后端

| 技术 | 版本 | 要求 |
|------|------|------|
| NestJS | 10+ | 模块化架构，依赖注入 |
| TypeScript | 5+ | Strict 模式 |
| Prisma | 5+ | ORM |
| Jest | 29+ | 单元测试框架，覆盖率 ≥ 80% |

### 开发工具

- **包管理**: pnpm 8+（必须）
- **NestJS CLI**: 推荐使用 `@nestjs/cli` 创建模块和控制器
- **UI/UX 设计**: Ant Design 设计系统，保持界面一致性和专业感
- **测试**: Vitest（前端）/ Jest（后端），覆盖率 ≥ 80%
- **代码风格**: ESLint + Prettier 统一代码风格，提交前必须检查通过

---

## TypeScript 严格规范

### 编译器配置（必须）

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 类型规则

| 规则 | 要求 |
|------|------|
| ✅ DO | 函数参数和返回值使用显式类型 |
| ❌ DON'T | 使用 `any`（除非有注释说明理由） |

---

## React 组件规范

### 组件规则

| 规则 | 要求 |
|------|------|
| ✅ ONLY | 函数组件 |
| ✅ MUST | 定义 Props 接口 |
| ❌ NO | 类组件 |

### 示例

```tsx
// ✅ 正确
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: UserProfileProps): JSX.Element {
  // ...
}

// ❌ 错误 - 类组件
class UserProfile extends React.Component { }

// ❌ 错误 - 无 Props 类型
function UserProfile(props) { }
```

---

### NestJS 架构规范

| 概念 | 用途 | 示例 |
|------|------|------|
| Module | 功能模块边界 | `@Module({ imports, controllers, providers })` |
| Controller | 请求路由处理 | `@Controller('knowledge')` |
| Service | 业务逻辑 | `@Injectable()` 类 |
| Guard | 权限验证 | `@UseGuards(AuthGuard)` |
| Pipe | 数据转换/验证 | `@UsePipes(ValidationPipe)` |
| DTO | 数据传输对象 | `class CreateKnowledgeDto` |

## API 设计规范

### RESTful 设计

| 要求 | 规范 |
|------|------|
| HTTP 方法 | GET, POST, PUT, DELETE, PATCH |
| 状态码 | 200, 201, 400, 401, 403, 404, 500 |

### NestJS 响应格式

使用拦截器统一包装响应：

```typescript
// 统一响应拦截器
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

// Controller 示例
@Controller('knowledge')
export class KnowledgeController {
  @Get()
  async findAll(): Promise<KnowledgePoint[]> {
    return this.knowledgeService.findAll();
  }
}
```

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 | 扩展名 |
|------|------|------|--------|
| React 组件 | PascalCase | `UserProfile.tsx` | .tsx |
| 工具函数 | camelCase | `formatDate.ts` | .ts |
| 类型定义 | PascalCase + .types | `User.types.ts` | .ts |
| 常量 | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` | .ts |
| Hooks | camelCase + use | `useAuth.ts` | .ts |

### 数据库（Prisma）

| 类型 | 规范 | 示例 |
|------|------|------|
| 表名 | snake_case, 复数 | `users`, `knowledge_points` |
| 列名 | snake_case | `created_at`, `importance_level` |
| 模型名 | PascalCase, 单数 | `User`, `KnowledgePoint` |

---

## 项目目录结构

### 前端 (web/)

```
web/
├── src/
│   ├── components/           # 可复用组件
│   │   ├── ui/              # 基础UI组件
│   │   ├── layout/          # 布局组件
│   │   └── features/        # 功能组件
│   ├── pages/               # 页面组件
│   ├── hooks/               # 自定义 Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型
│   ├── services/            # API 服务
│   └── styles/              # 全局样式
├── package.json
└── vite.config.ts
```

### 后端 (server/)

```
server/
├── src/
│   ├── modules/             # 功能模块（按业务域划分）
│   │   ├── auth/           # 认证模块示例
│   │   ├── knowledge/      # 知识库模块
│   │   └── learning/       # 学习模块
│   ├── common/             # 共享组件
│   │   ├── filters/        # 异常过滤器
│   │   ├── guards/         # 守卫
│   │   ├── interceptors/   # 拦截器
│   │   └── decorators/     # 自定义装饰器
│   ├── config/             # 配置文件
│   ├── prisma/             # Prisma 服务
│   └── main.ts             # 应用入口
├── prisma/
│   ├── schema.prisma       # 数据库模型
│   └── migrations/         # 迁移文件
├── package.json
└── tsconfig.json
```

---

## Ant Design 组件规范

### 组件引入

**推荐方式**：按需引入
```typescript
// ✅ 正确 - 按需引入
import { Button, Table, Tree } from 'antd';
import type { ButtonProps } from 'antd';

// ❌ 错误 - 全量引入
import Antd from 'antd';
```

**图标引入**
```typescript
import { UserOutlined, FileOutlined } from '@ant-design/icons';
```

### 主题定制

**ConfigProvider 配置**
```typescript
import { ConfigProvider } from 'antd';

const theme = {
  token: {
    colorPrimary: '#1890FF',      // 主色
    colorSuccess: '#52C41A',      // 成功
    colorWarning: '#FAAD14',      // 警告
    colorError: '#F5222D',        // 错误
    fontSize: 14,                 // 正文字号
    borderRadius: 4,              // 圆角
  },
};

<ConfigProvider theme={theme}>
  <App />
</ConfigProvider>
```

### 常用组件列表

| 组件 | 用途 | 注意事项 |
|------|------|----------|
| **Tree** | 知识点树导航 | 使用 `virtual` 属性支持大数据量 |
| **Table** | 数据列表展示 | 使用 `scroll` 处理横向溢出 |
| **Form** | 学习反馈表单 | 配合 `useForm` 进行验证 |
| **Button** | 操作按钮 | 主操作用 `type="primary"` |
| **Modal** | 弹窗对话框 | 注意 `destroyOnClose` 重置状态 |
| **Drawer** | 侧滑面板 | 右侧 AI 侧栏可用 |
| **Tabs** | 标签页切换 | 移动端适配时使用 |
| **Progress** | 学习进度 | 配合掌握程度颜色 |
| **Tag** | 标签展示 | 重要性 A/B/C 标签 |
| **Rate** | 掌握程度评分 | 自定义为 5 级（A-E）|

### 组件使用最佳实践

**表单组件**
```typescript
// ✅ 正确 - 使用 Form 组件管理状态
<Form form={form} onFinish={handleSubmit}>
  <Form.Item name="mastery" rules={[{ required: true }]}>
    <Select options={masteryOptions} />
  </Form.Item>
</Form>
```

**表格组件**
```typescript
// ✅ 正确 - 定义列配置类型
const columns: ColumnsType<KnowledgePoint> = [
  { title: '编号', dataIndex: 'code' },
  { title: '名称', dataIndex: 'name' },
];
```

**树形组件**
```typescript
// ✅ 正确 - 大数据量使用虚拟滚动
<Tree
  treeData={treeData}
  height={600}
  virtual
  onSelect={handleSelect}
/>
```

### 样式覆盖规范

**推荐方式**：使用 CSS Modules 或 Styled Components
```typescript
// ✅ 正确 - CSS Modules
import styles from './Component.module.css';

// ❌ 错误 - 直接修改全局样式
.ant-button { ... }
```

**主题变量覆盖**
```css
/* 在全局样式文件中 */
:root {
  --ant-primary-color: #1890FF;
}
```

---

## 特色功能规范

### LaTeX 数学公式

- 使用 KaTeX 或 MathJax
- 行内公式: `$...$`
- 块级公式: `$$...$$`

### Mermaid 图表

- 支持流程图、时序图、类图等
- **转义规则**: 特殊字符使用全角字符代替
  - 单引号 `'` → `'` (全角单引号)
  - 双引号 `"` → `"` (全角双引号)
  - 小括号 `()` → `（）` (全角括号)
  - 中括号 `[]` → `［］` (全角方括号)

### ECharts 图表

- 学习分析数据可视化
- 统一配色方案

---

## OpenSpec 集成

> **前置检查**：在使用 OpenSpec 前，请先阅读 [AGENTS.md](../../../AGENTS.md) 中的「OpenSpec 理解约束」章节。

### 何时使用 OpenSpec

| 变更类型 | 使用 OpenSpec? | 方式 |
|----------|---------------|------|
| Typo 修复 | 否 | 直接编辑 |
| 新组件 | 是 | `openspec-propose` |
| 新功能 | 是 | `openspec-propose` |
| 数据库变更 | 是 | `openspec-propose` |

### 处理活跃变更

**必须**:
1. 阅读 `tasks.md` 了解当前状态
2. 参考 `design.md` 的技术决策
3. 完成任务后勾选
4. 如有偏差更新工件

---

## 完成前强制检查清单

### 代码质量

- [ ] `tsc --noEmit` 通过，零错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 无 `console.log` 或 `debugger` 语句
- [ ] 无未使用导入或变量
- [ ] 所有函数有返回类型
- [ ] 所有组件有 Props 接口
- [ ] 单元测试覆盖率 ≥ 80%（Vitest 前端 / Jest 后端）
- [ ] ESLint + Prettier 代码风格检查通过（`pnpm lint` 无错误）

### OpenSpec（如适用）

- [ ] tasks.md 所有任务完成
- [ ] 实现符合 design.md 决策
- [ ] 已执行 `openspec archive <name>` 归档

---

## 常用命令速查

| 任务 | 命令 |
|------|------|
| 检查变更 | `openspec list --json` |
| 创建变更 | `openspec new change <name>` |
| 归档变更 | `openspec archive <name>` |
| 类型检查 | `tsc --noEmit` |
| 运行测试 | `vitest` (前端) / `jest` (后端) |
| 测试覆盖率 | `vitest --coverage` / `jest --coverage` |
| 代码检查 | `pnpm lint` (ESLint) |
| 代码格式化 | `pnpm format` (Prettier) |

---

## 记住

1. **Always** 首先检查活跃的 OpenSpec 变更
2. **Always** 遵循 TypeScript 严格模式
3. **Always** 完成预完成检查清单
4. **Always** 归档已完成的变更

**有疑问时**：询问用户或参考 [openspec/constitution.md](../../../openspec/constitution.md)

---

*Version: 1.0*
*Last Updated: 2026-03-12*
