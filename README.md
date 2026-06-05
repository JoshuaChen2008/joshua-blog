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

# 格式化代码
bun run format

# 代码检查
bun run lint

# 一键检查与格式化
bun run yijiansilian
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
