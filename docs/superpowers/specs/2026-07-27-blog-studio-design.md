# Blog Studio — 可视化文章创建工具 · 设计文档

日期：2026-07-27
状态：设计与初版 UI 已与用户确认，待实现
初版 UI：`scripts/studio/public/`（静态 mock，可直接用浏览器打开）

## 1. 目标

用一个本地可视化页面取代记忆命令行参数的过程，覆盖 `blog` / `diary` / `note` 三个集合的文章创建：

- 可视化选择集合、填写 frontmatter，**可选字段用开关自定义**。
- 三种内容来源：生成空模板、粘贴正文、拖入 `.md` 文件；后两者自动套好模板（已有 frontmatter 则解析预填，无则从 `# H1` 提取标题）。
- blog / diary 支持在同一流程里拖入封面图，复用现有 sharp 管线。
- 常用组合存为预设，一键套用。

现有 CLI（`blog:new` / `diary:new` / `blog:cover`）**继续可用**，与页面共用同一套渲染代码。

## 2. 已确认的决定

| #   | 决定                                                                            |
| --- | ------------------------------------------------------------------------------- |
| 1   | 独立 Bun 服务（`bun blog:studio`），不进 Astro 路由，不进部署产物               |
| 2   | 保留自定义文件名输入框，默认 `index.md`；存量文件命名不动                       |
| 3   | note 不支持封面                                                                 |
| 4   | blog / diary 统一单引号 + 列表式 tags；**note 保留现有的双引号 + 内联数组风格** |
| 5   | 新增 `yaml` 到 devDependencies，用于导入时解析任意来源的 frontmatter            |

## 3. 现状盘点

|          | blog                                | diary         | note                                 |
| -------- | ----------------------------------- | ------------- | ------------------------------------ |
| 路径布局 | `src/content/blog/<目录>/<文件>.md` | 同左          | `src/content/note/<文件>.md`（平铺） |
| 日期字段 | `publishDate`                       | `publishDate` | `date`                               |
| 现有脚本 | `blog:new`                          | `diary:new`   | **无，本次补上**                     |
| 封面     | `blog:cover`                        | `blog:cover`  | 不支持                               |
| 存量条目 | 0                                   | 6             | 9                                    |

存量文件命名不统一（`index.md` / `dayi.md` / `暑假-第一周.md` / `Qimo3.md`），按决定 2 不做迁移。

## 4. 架构

```
scripts/blog/schema.ts          新增  COLLECTION_CONFIG + 字段描述表
scripts/blog/frontmatter.ts     新增  render / parse，服务端与浏览器共用
scripts/blog/shared.ts          改造  集合常量拆两组、新增 deriveEntryId
scripts/blog/create.ts          改造  支持 note / 自定义文件名 / 全字段
scripts/blog/cover.ts           不动
scripts/blog/presets.json       新增  预设存储（随仓库提交）
scripts/studio/server.ts        已有骨架  Bun.serve 静态服务；/api/* 全部返回 501 待实现
scripts/studio/public/          已有初版  index.html / style.css / app.js
```

`package.json` 已加 `"blog:studio": "bun scripts/studio/server.ts"`，
`.claude/launch.json` 已加 `blog-studio` 配置（端口 4399）。

默认端口 4399，支持 `--port <n>`；端口被占用时报错退出，不自动改端口。

### 4.1 渲染器只写一份

服务启动时用 `Bun.build({ entrypoints: ['scripts/blog/frontmatter.ts'], target: 'browser' })` 产出浏览器版本，挂在 `/app/frontmatter.js` 供页面 `import`。页面的实时预览是纯客户端计算（零延迟），与 CLI、写入接口用同一份源码，不会漂移。

**约束**：`frontmatter.ts` 与 `schema.ts` 必须是纯逻辑，不得 import `node:fs` / `node:path` 等 Node 内置模块，否则无法给浏览器用。路径拼接逻辑留在 `shared.ts` / `create.ts`。

### 4.2 集合常量必须拆成两组

`resolveArticleCollection`（`shared.ts`）遍历 `CONTENT_COLLECTIONS` 判断封面所在目录。若直接把 `'note'` 加进去，`cover.ts` 会开始接受 note 目录，与决定 3 冲突。因此：

```ts
export const POST_COLLECTIONS = ['blog', 'diary'] as const // cover.ts 用，行为不变
export const ALL_COLLECTIONS = ['blog', 'diary', 'note'] as const // create / studio 用
export type ContentCollection = (typeof ALL_COLLECTIONS)[number]
```

`resolveArticleCollection` 改为遍历 `POST_COLLECTIONS`，其余行为与错误文案保持不变。

### 4.3 集合配置表

三处差异集中在一张表，UI 与 CLI 都读它：

```ts
export const COLLECTION_CONFIG = {
  blog: {
    label: 'Blog',
    layout: 'directory',
    dateField: 'publishDate',
    style: { quote: "'", tags: 'block' },
    cover: true
  },
  diary: {
    label: 'Diary',
    layout: 'directory',
    dateField: 'publishDate',
    style: { quote: "'", tags: 'block' },
    cover: true
  },
  note: {
    label: 'Note',
    layout: 'flat',
    dateField: 'date',
    style: { quote: '"', tags: 'inline' },
    cover: false
  }
}
```

- `layout: 'directory'` → 建目录 `<content>/<目录名>/`，写入 `<文件名>`（默认 `index.md`）。
- `layout: 'flat'` → 直接写 `<content>/<文件名>`，无目录名输入。

## 5. 字段描述表

`schema.ts` 导出 `FIELDS: FieldDescriptor[]`，UI 表单完全由它渲染，不手写。

```ts
interface FieldDescriptor {
  name: string
  label: string // 中文标签
  type:
    | 'text'
    | 'textarea'
    | 'date'
    | 'boolean'
    | 'enum'
    | 'tags'
    | 'color'
    | 'url'
    | 'entryRef'
    | 'heroImage'
  collections: ContentCollection[]
  required: boolean // 表单常驻且不可关闭
  default?: unknown
  maxLength?: number
  options?: string[] // enum
  refCollection?: ContentCollection // entryRef 指向哪个集合
  hint?: string
}
```

### 5.1 blog / diary

输出顺序即下表顺序（与存量 `暑假-第一周` 一致）：

| 字段          | 类型      | 必填 | 默认                   | 约束                         |
| ------------- | --------- | ---- | ---------------------- | ---------------------------- |
| `title`       | text      | ✔    | —                      | ≤ 60                         |
| `publishDate` | date      | ✔    | 今天（Asia/Singapore） | `YYYY-MM-DD`                 |
| `updatedDate` | date      |      | 今天                   | 默认开启                     |
| `description` | textarea  | ✔    | `''`                   | ≤ 160                        |
| `tags`        | tags      |      | `[]`                   | 默认开启                     |
| `language`    | text      |      | `'Chinese'`            | 默认开启                     |
| `heroImage`   | heroImage |      | —                      | 由封面流程写入，表单只读展示 |
| `draft`       | boolean   |      | `false`                |                              |
| `comment`     | boolean   |      | `true`                 |                              |

`description` 在 zod 里是必填但允许空串，因此**空值不阻断提交，只出黄色提示**。

### 5.2 note

| 字段             | 类型     | 必填 | 默认            | 约束                                                 |
| ---------------- | -------- | ---- | --------------- | ---------------------------------------------------- |
| `title`          | text     | ✔    | —               | 无硬上限，UI 软提示 60                               |
| `description`    | textarea |      | —               | 软提示 160                                           |
| `date`           | date     | ✔    | 今天            | `YYYY-MM-DD`                                         |
| `updatedDate`    | date     |      | —               |                                                      |
| `accentColor`    | color    |      | —               | `#RRGGBB`，格式错只警告                              |
| `tags`           | tags     |      | `[]`            |                                                      |
| `type`           | enum     |      | `'note'`        | note / snippet / draft / idea / research / reference |
| `status`         | enum     |      | `'in-progress'` | in-progress / incomplete / ready / archived          |
| `draft`          | boolean  |      | `false`         |                                                      |
| `language`       | text     |      | —               |                                                      |
| `translationKey` | text     |      | —               |                                                      |
| `relatedBlog`    | entryRef |      | —               | 多选，来源 blog 集合 id                              |
| `relatedNote`    | entryRef |      | —               | 多选，来源 note 集合 id                              |
| `source`         | url      |      | —               | 必须是合法 URL                                       |
| `comment`        | boolean  |      | `true`          |                                                      |

`heroImage` 存在于 note 的 zod schema 中，但按决定 3 **不在 studio 中暴露**。

### 5.3 防漂移测试（必做）

新增测试断言 `FIELDS` 中每个集合的字段名集合，与 `src/content.config.ts` 对应 zod schema 的 `.shape` keys **完全相等**（note 的 `heroImage` 列为已知豁免项，在测试里显式声明）。以后 schema 改字段，测试立刻失败。

## 6. Frontmatter 渲染规则

`renderFrontmatter(collection, values): string`，只输出「必填 + 已开启且有值」的字段，按 5.1 / 5.2 的顺序。

### 6.1 blog / diary 风格

```yaml
---
title: '暑假的第一周'
publishDate: 2026-07-14
updatedDate: 2026-07-14
description: 'GPT-5.6如何改变我的生活...'
tags:
  - Diary
  - 日常
language: 'Chinese'
heroImage: { src: './chuyini1.webp', color: '#FFE4B5' }
draft: false
---
```

- 字符串：单引号包裹，内部 `'` 转义为 `''`（沿用现有 `escapeYamlSingleQuoted`）。
- 日期、布尔：裸值，不加引号。
- tags：块状列表，两空格缩进。
- `heroImage`：单行内联对象，格式与 `cover.ts` 的 `upsertHeroImage` 逐字符一致。

### 6.2 note 风格

```yaml
---
title: '3天速通全栈项目'
description: '通过一个文档，一个项目，加深对全栈项目的理解'
date: 2026-07-12
accentColor: '#4891B2'
tags: ['Next.js', '全栈', 'TypeScript']
type: 'note'
status: 'ready'
draft: false
---
```

- 字符串：双引号，转义规则等价于 `JSON.stringify`。
- tags / relatedBlog / relatedNote：内联数组，**逗号后无空格**。
- 枚举值（`type` / `status`）按字符串处理，带双引号。

### 6.3 正文与换行

- 输出 = `frontmatter` + `\n` + 正文 + 末尾单个 `\n`。正文为空时保留一个空行，与现有 `create.ts` 行为一致。
- 新文件一律用 `LF`。`cover.ts` 已有的 CRLF 探测逻辑不动（它处理的是已存在文件）。
- tags 大小写按用户输入原样写入（Astro 读取时才 lowercase 去重）。

## 7. Frontmatter 解析规则（导入用）

`parseFrontmatter(raw): { fields: Record<string, unknown>, unknown: Record<string, unknown>, body: string } | null`

1. 内容以 `---` 开头且存在闭合 `---` → 用 `yaml` 解析中间块；解析异常则返回 `null`（调用方降级为「整段当正文」并提示）。
2. 已知字段（在 `FIELDS` 中的）映射进表单；日期统一格式化为 `YYYY-MM-DD`（Asia/Singapore）。
3. **未知字段必须保留**，不得丢弃：由 `yaml` 重新序列化后追加在已知字段之后写入文件，UI 在只读区块中列出并提示「以下字段不受表单管理，将原样保留」。
4. 无 frontmatter 时：
   - 首个 `# ` 标题 → `title`，并**从正文中删除该行**（主题自己渲染标题，留着会重复）。
   - 首个非空段落 → `description`，空白折叠为单空格；超过 160 字符时截断到 159 并追加 `…`。
   - 这些值标记为「建议值」，在 UI 中带琥珀色左标；用户编辑后标记消失。
5. 正文中若存在指向本地路径的图片引用（`](./` 或 `](../`），提交前给出警告，v1 不做图片复制。
6. **切换集合或套用预设时，已解析的未知字段与导入提示一并清空**。原因：字段「是否未知」取决于当前集合，且切集合本来就会重置全部表单值，留着未知字段会串到下一篇文章里。正文不清空（用户可能只是改投另一个集合）。初版 UI 已按此实现。

## 8. HTTP 接口契约

所有响应 `application/json`；错误统一 `{ "error": "中文说明" }` + 4xx/5xx。

| 方法   | 路径                  | 请求                                                                       | 响应                                         |
| ------ | --------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| GET    | `/`                   | —                                                                          | 静态页面                                     |
| GET    | `/app/frontmatter.js` | —                                                                          | 浏览器版渲染器（启动时构建）                 |
| GET    | `/api/meta`           | —                                                                          | `{ config, fields, tags, entries, presets }` |
| POST   | `/api/check-path`     | `{ collection, directoryName?, fileName }`                                 | `{ path, exists }`                           |
| POST   | `/api/create`         | `{ collection, directoryName?, fileName, fields, unknown?, body }`         | `{ directoryPath?, markdownPath, entryId }`  |
| POST   | `/api/cover`          | multipart：`file` + `markdownPath` + `name? quality? width? color? force?` | `{ outputPath, color, markdownPath }`        |
| GET    | `/api/presets`        | —                                                                          | `Preset[]`                                   |
| POST   | `/api/presets`        | `Preset`                                                                   | `Preset[]`                                   |
| DELETE | `/api/presets/:name`  | —                                                                          | `Preset[]`                                   |
| POST   | `/api/open`           | `{ path }`                                                                 | `{ ok: true }`                               |

细节：

- `/api/meta` 的 `tags` 形如 `{ blog: [{ value: 'Blog', count: 3 }, ...], ... }`，按 count 降序；`entries` 形如 `{ blog: ['FristBlog'], note: ['全栈挑战'] }`，供 `relatedBlog` / `relatedNote` 下拉。扫描在每次请求时实时进行（文件量很小，不做缓存）。
- `/api/cover` 的执行顺序是**先写文章再处理封面**：`convertBlogCover` 要求文章目录已存在且恰好含一个 md。服务先把上传的图片落到文章目录下的临时文件名，再以该路径调用 `convertBlogCover({ removeSource: true })`。集合为 `note` 时直接返回 400。
- `/api/open` 用 `Bun.spawn(['explorer.exe', path])` **数组参数**调用，禁止拼接 shell 字符串；调用前校验 `path` 位于项目根目录内。

## 9. 页面交互规格

初版 UI 已实现于 `scripts/studio/public/`，实施时保留结构，把 `MOCK_META` 换成 `/api/meta`、把提交换成真实接口。

### 9.1 布局

左右两栏：左侧表单可滚动，右侧预览 sticky。

- 顶栏：标题、预设下拉、保存预设。
- 第 1 段 **集合**：Blog / Diary / Note 三张卡片，切换即重建下方字段。
- 第 2 段 **位置**：目录名（仅 directory 布局）、文件名（默认 `index.md`）。下方常驻一行实时路径 `将创建 → src/content/diary/暑假-第二周/index.md`，带存在性状态。
- 第 3 段 **必填字段**。
- 第 4 段 **可选字段**：每行一个开关，打开后展开输入控件。
- 第 5 段 **内容**：三个 tab —— 空模板 / 粘贴正文 / 拖入文件。
- 第 6 段 **封面**（仅 blog / diary）：拖放区 + 主色色块 + 手动覆盖。
- 底部操作条：生成按钮 + 校验摘要。

### 9.2 必须实现的交互细节

- **实时路径**是这个工具的核心价值，任何时候都可见；note 自动隐藏目录名输入。
- **提前探测冲突**：目录名/文件名变化时防抖 300ms 调 `/api/check-path`，已存在则输入框标红并禁用提交。现有 `flag: 'wx'` 保留为服务端最后一道防线。
- **字符计数器**：title 60、description 160，超限标红并阻断提交。
- **标签输入**：chip 形式 + 已有标签补全（带使用次数）。若新标签与已有标签仅大小写不同，提示「已存在 `Blog`，Astro 会视为同一标签」。
- **实时预览**：右栏显示最终 markdown 全文（frontmatter + 正文前若干行），不是抽象描述。
- **生成后**：显示实际路径，提供「打开所在文件夹」与「复制路径」。

### 9.3 预设

存 `scripts/blog/presets.json`，随仓库提交，初始种一条「周记」：

```json
{
  "name": "周记",
  "collection": "diary",
  "enabled": ["updatedDate", "language"],
  "fields": {
    "title": "期末月-第{{n}}周",
    "tags": ["Diary", "日常"],
    "language": "Chinese"
  },
  "directoryName": "期末月-第{{n}}周"
}
```

占位符：`{{date}}` `{{year}}` `{{month}}` `{{day}}` `{{n}}`。含 `{{n}}` 的预设在套用时先弹一个数字输入。

## 10. 安全与约束

这是一个会写文件的本地服务，三条必须落实：

1. **只监听回环地址**：`Bun.serve({ hostname: '127.0.0.1' })`，不做鉴权。
2. **路径三层守卫**：`assertSafePathSegment`（已有）→ 解析后的绝对路径必须以 `src/content/<collection>` + 分隔符开头 → 写入沿用 `flag: 'wx'`。
3. **不拼 shell**：`/api/open` 用数组参数 spawn。

另外：服务只在本地手动运行，不加入 `bun dev`，不进 Astro 路由，不影响 Vercel 部署产物。

## 11. 测试要求

在现有 `bun test scripts/blog` 下扩展：

- `frontmatter.test.ts`
  - 三集合各自的风格输出（引号、tags 块状/内联、字段顺序、逗号无空格）。
  - 转义：blog 单引号 `''` 加倍；note 双引号与反斜杠。
  - 可选字段关闭时不出现在输出中。
  - `heroImage` 内联对象与 `cover.ts` 的 `upsertHeroImage` 输出逐字符一致。
  - `render → parse → render` 幂等。
  - 未知字段在解析后被保留。
  - 无 frontmatter 时的 H1 提取 + 该行从正文删除、description 截断到 160。
- `schema.test.ts`：字段表与 `content.config.ts` zod keys 的 parity 断言。
- `create.test.ts`：补 note 平铺布局、自定义文件名、默认 `index.md`、目录已存在时报错。
- `shared.test.ts`：`resolveArticleCollection` 仍拒绝 note 目录；路径守卫拒绝 `..` 逃逸。

## 12. 已知风险

**`deriveEntryId` 的准确性**。`relatedBlog` / `relatedNote` 下拉需要 Astro glob loader 生成的条目 id。从模板文件看规则是「相对 base 的路径去扩展名、`index` 段被丢弃」（`FristBlog/index.md` → `FristBlog`），但存量的 `暑假-第一周/暑假-第一周.md` 这类命名下的实际 id 未经验证。

实施时先跑 `bun sync`，从 `.astro` 的数据存储中读出全部 15 条存量条目的真实 id，据此写 `deriveEntryId` 并用这 15 条作为测试用例。**不要凭规则猜测**。若结论是无法用纯函数稳定推导，则退化方案为：`relatedBlog` / `relatedNote` 改为纯文本输入 + 已有条目提示列表，不做强校验。

## 13. 验收标准

- [ ] `bun blog:studio` 起服务，浏览器打开可完成三种集合的创建。
- [ ] blog / diary 默认生成 `index.md`，note 生成平铺文件；文件名输入框可覆盖。
- [ ] 生成的文件通过 `bun astro check`，0 error。
- [ ] blog / diary 输出为单引号 + 块状 tags；note 输出为双引号 + 内联数组。
- [ ] 粘贴一篇带 frontmatter 的旧文章能正确预填表单且不重复包裹；未知字段被保留。
- [ ] 粘贴一篇纯正文能提取 H1 作标题并从正文中移除该行。
- [ ] blog / diary 拖入封面后生成 `.webp` 并回写 `heroImage`，note 无封面入口。
- [ ] 「周记」预设一键套用，`{{n}}` 弹窗生效。
- [ ] `blog:new` / `diary:new` / `blog:cover` 三条 CLI 行为不回退，`bun test scripts/blog` 全绿。
- [ ] `bun build` 产物中不含 studio 任何代码。

## 14. 非目标（留给 v2）

编辑已有文章的 frontmatter、删除 / 重命名、note ↔ blog 互转、正文图片库管理、note 封面、任何形式的线上部署。
