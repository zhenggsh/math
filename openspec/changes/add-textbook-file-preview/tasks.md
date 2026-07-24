# Tasks: add-textbook-file-preview

> 依据：design.md（D1-D7 决策）、工程评审 7 个实施任务（T1-T7）、21 个强制测试项
> 顺序：数据层修复先行（止血），后端端点与前端准备可并行，详情页改造最后合流

## 1. 后端：sheet 检测统一与 xlsx 写路径修复（P1，先行止血）

- [x] 1.1 在 `textbook-parser.service.ts` 暴露框架 sheet 检测结果（`parseXlsx`/`ParseResult` 返回所选 sheetName，或新增独立的框架 sheet 检测方法）
- [x] 1.2 修复 `textbook-file.service.ts` 的 `appendXlsxRows`：目标 sheet 改用框架 sheet 检测（不再用 `SheetNames[0]`），列按表头名映射（兼容编号列在最后的列序，不再按固定位置写入）
- [x] 1.3 新增 Jest 测试：封面在前的多 sheet 夹具——追加行落到框架 sheet、各列按表头名对齐、封面不被修改；单 sheet 文件行为不变（回归）
- [x] 1.4 运行 `cd server && pnpm test` 确认 textbook 相关测试全绿

## 2. 数据修复：math01.xlsx（P1，修复前先备份）

- [x] 2.1 备份 `iksm/math01.xlsx`、`iksm/math02.xlsx` 到 `.bak/` 目录
- [x] 2.2 编写一次性修复脚本（`server/scripts/` 或 node）：清除 math01.xlsx 封面 sheet 行 15-42 的 28 行错位知识点数据，恢复封面原貌
- [x] 2.3 以数据库中已有的 2.4.x 扩充知识点为准，将框架行（含一级/二级/三级、定义、特性、重要性、编号，按框架 sheet 表头列序）补入知识点框架 sheet
- [x] 2.4 检查 math02.xlsx 是否存在同样的封面污染，如有则同样修复
- [x] 2.5 运行验证脚本断言：框架 sheet 含全部 2.4.x 编号行、封面无知识点行、与 DB 中知识点编号集合一致

## 3. 后端：文件预览端点（P1，依赖任务 1）

- [x] 3.1 实现 `GET /textbooks/:id/framework-file`：复用 `getFilePath` 读文件、parser 解析全量行，返回 `{ fileName, fileType, sheetName?, rows, totalRows, lastModifiedAt(fs mtime) }`，TEACHER/ADMIN 鉴权
- [x] 3.2 实现 `GET /textbooks/:id/content-file`：返回 `{ fileName, content, totalLines, lastModifiedAt }`；contentPath 为空时返回空状态标记
- [x] 3.3 Jest 覆盖：happy(xlsx/csv)、教材不存在 404、磁盘文件缺失 404、解析失败 422、contentPath 空、STUDENT 访问 403

## 4. 前端：解析对齐（P1，可与 1-3 并行）

- [x] 4.1 修改 `web/src/utils/textbookFilePreview.ts`：sheet 选择镜像服务端框架 sheet 检测逻辑（不再固定 SheetNames[0]），表头 trim 与服务端对齐
- [x] 4.2 新增 Vitest：与服务端共享的封面在前多 sheet 夹具，断言前端预览选中框架 sheet、结果与服务端解析一致

## 5. 前端：组件迁移与定位器抽取（P1，可与 1-3 并行）

- [x] 5.1 移动 `FrameworkPreview.tsx`/`MdPreview.tsx`（含测试）到 `web/src/components/textbook-preview/` 并更新全部引用
- [x] 5.2 两组件空态文案改为 `emptyDescription` prop（弹窗保持现有文案为默认值）；`highlightedCode` 扩展为 `highlightedCodes?: string[]`
- [x] 5.3 从弹窗抽出 `findMdLineByCode` 为纯函数 `web/src/utils/mdLineLocator.ts`（原样搬迁，含 `(?![\d.])` 负向前瞻与后代退化匹配）
- [x] 5.4 新增 locator Vitest：二/三/四级标题匹配、1.1 不误匹配 1.10、"知识点 " 前缀与全角冒号变体、后代退化、无匹配返回空
- [x] 5.5 扩充弹窗改为引用共享组件与 locator，运行现有弹窗/组件测试确认行为零变化（回归门禁；若暴露问题按设计 D3 降级为方案 A）

## 6. 前端：详情页双栏改造（P1，依赖 3 和 5）

- [x] 6.1 `web/src/services/textbook.service.ts` 增加两个文件端点的 API 方法；`useTextbookDetail` 增加双文件获取与 loading/error/empty 三态
- [x] 6.2 `TextbookDetailPage` 改造：保留信息卡与扩充入口，移除 DB 知识点表格，嵌入 Allotment 双栏 `TextbookFilePreview`（左 FrameworkPreview / 右 MdPreview），窄屏退化垂直堆叠
- [x] 6.3 实现点击框架行 → mdLineLocator 定位 → MdPreview 高亮 + scrollIntoView
- [x] 6.4 实现「重新加载」按钮（只重读文件）与文件 mtime vs DB lastModifiedAt 分歧警告 Tag
- [x] 6.5 扩充成功后：自动 refetch 两文件端点 + `highlightedCodes=addedCodes` 高亮 + 3s 定时器（移植自 newPointCodes 代码）；滚动 effect 依赖必须含 rows（防竞态）
- [x] 6.6 Vitest 页面测试：点击定位、三态渲染、扩充后 refetch 且断言高亮作用于 post-refetch 行集（防 jsdom 假绿）

## 7. 全量验证（P2，依赖 1-6）

- [x] 7.1 `pnpm typecheck`（前后端 tsc --noEmit 无错误）、`pnpm lint` 通过
- [x] 7.2 `pnpm test` 前后端全部测试通过（含既有扩充弹窗回归）
- [ ] 7.3 按测试计划手动验证：math01 全闭环（预览→点击定位→扩充→自动刷新高亮）、math02、无 md 教材空态、窄屏 Drawer、2400 行 md 滚动实测、外部改文件后重新加载、分歧 Tag 展示
- [x] 7.4 验证 DB/md/xlsx 三方一致性（2.4.x 在三处均存在且编号集合一致）

## 8. 收尾

- [x] 8.1 确认 TODOS.md 两条记录（路径遍历防护、正则连字符）无需本期处理
- [ ] 8.2 运行 `openspec validate add-textbook-file-preview`（如 CLI 支持）并归档变更
