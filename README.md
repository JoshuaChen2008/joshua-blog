# Joshua Chen's Personal Blog

一个基于 Astro 和 Astro Theme Pure 构建的个人博客，用来记录技术学习、项目实践、开源探索和一些个人兴趣。

仓库地址：[JoshuaChen2008/joshua-blog](https://github.com/JoshuaChen2008/joshua-blog)
网页链接：blog.joshua2008.top

---

## About me

AI Agent & Full-Stack Developer

我目前就读于天津理工大学，是一名大一学生。正在朝着全栈开发者和活跃开源贡献者的方向学习与成长，希望通过代码实践、项目积累和社区交流不断提升自己。

平时喜欢在 VRChat、Unity 等软件中进行类摄影创作，也喜欢折腾电子设备，并持续关注新兴电子产品。

## 技术栈

### 核心

Astro, TypeScript, Bun

### 内容与样式

MDX, UnoCSS, Shiki, KaTeX

### 功能

RSS, Sitemap, Pagefind, Waline, Dynamic OG Image

### 部署

Vercel, Astro Adapter

## 本地开发

环境要求：

- [Node.js](https://nodejs.org/)：建议使用 `v22.12.0` 或更高版本
- [Bun](https://bun.sh/)：项目统一使用 Bun 管理依赖和运行脚本

克隆仓库：

```shell
git clone https://github.com/JoshuaChen2008/joshua-blog.git
cd joshua-blog
```

常用命令：

```shell
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建项目
bun run build

# 预览构建结果
bun run preview

# 同步 Astro 类型
bun run sync

# 类型检查
bun run check

# 创建新文章
bun run pure new

# 创建带独立目录的 Blog 模板
bun run blog:new -- "全栈开发实践"

# 创建带独立目录的 Diary（日记）模板
bun run diary:new -- "暑假-第二周"

# 将文章目录中的封面转为 WebP，并自动写入 heroImage（blog 和 diary 均可）
bun run blog:cover -- "src/content/diary/暑假-第二周/封面.png"

# 格式化代码
bun run format

# 代码检查
bun run lint

# 一键检查与格式化
bun run yijiansilian
```

## 文章创建与封面处理

站点分为两个文章板块：`src/content/blog/`（Blog，正式文章）和 `src/content/diary/`（Diary，日常日记）。每篇文章使用独立目录存放 Markdown 和封面图片：

```text
src/content/diary/
└─ 暑假-第二周/
   ├─ 暑假-第二周.md
   └─ 封面.webp
```

### 创建文章模板

执行以下命令可创建文章目录和空白 Markdown 模板：

```shell
# Blog 文章（写入 src/content/blog，模板带 Blog 标签）
bun run blog:new -- "全栈开发实践"

# Diary 日记（写入 src/content/diary，模板带 Diary、日常 标签）
bun run diary:new -- "暑假-第二周"
```

标题使用目录名，发布日期和更新日期使用 Asia/Singapore 时区的当天日期，语言默认 `Chinese`，不会写入 `draft`。`diary:new` 等价于 `blog:new` 加 `--diary` 参数。

如需让目录名、Markdown 文件名和文章标题不同，可以使用：

```shell
bun run blog:new -- "期末月-第四周" --file Qimo4 --title "期末月的第四周"
```

这会生成 `src/content/blog/期末月-第四周/Qimo4.md`。命令不会覆盖已有目录。

### 转换并设置封面

先把 PNG、JPEG 等原图放入文章目录，然后执行：

```shell
bun run blog:cover -- "src/content/blog/暑假-第二周/封面.png"
```

命令会完成以下操作：

- 使用 Sharp 自动修正 EXIF 方向。
- 将图片等比缩放到最大宽度 1920px，小图不会放大。
- 使用质量 82 转换为同名 WebP，默认保留原图。
- 自动提取图片主色。
- 找到同目录中唯一的 `.md` 或 `.mdx`，写入或更新 `heroImage`。

最终 frontmatter 会增加类似内容：

```yaml
heroImage: { src: './封面.webp', color: '#FFE4B5' }
```

可以按需覆盖默认参数：

```shell
bun run blog:cover -- "src/content/blog/暑假-第二周/封面.png" --name chuyini2 --quality 85 --width 1600 --color "#FFE4B5"
```

可用选项：

- `--name <文件名>`：指定输出名称，扩展名固定为 `.webp`。
- `--quality <1-100>`：设置 WebP 质量，默认 `82`。
- `--width <像素>`：设置最大宽度，默认 `1920`。
- `--color <#RRGGBB>`：使用指定主题色，不自动提取。
- `--force`：覆盖已经存在的目标 WebP。
- `--remove-source`：转换并更新文章成功后删除原图。

封面路径必须位于 `src/content/blog` 或 `src/content/diary` 下的一级文章目录中（脚本自动识别），该目录必须且只能包含一个 Markdown 或 MDX 文件。未生成封面前，文章模板不会提前写入无效的 `heroImage` 路径。

运行 Blog 工具测试：

```shell
bun run test:blog
```

## 特性

- 快速、高性能的 Astro 内容站点
- 简洁、响应式的页面设计
- 支持博客、笔记、项目页和关于页等内容组织方式
- 内置全站搜索、RSS、Sitemap 与 SEO 配置
- 支持文章目录、代码高亮、数学公式与图片灯箱
- 支持动态 Open Graph 图片生成
- 支持评论、浏览量和友链等常见博客能力

## 主题

本博客基于 [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure) 主题构建，并在此基础上进行个人化配置与内容创作。

## 许可

本项目基于 Apache 2.0 协议开源。
