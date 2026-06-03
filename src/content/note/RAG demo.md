
---
title: "LLM+MCP+RAG demo的实现"
description: "llm+mcp+rag的mvp项目的笔记"
date: 2026-05-24
accentColor: "#4891B2"
tags: ["Agent", "RAG", "MCP"]
type: "note"
status: "incomplete"

draft: false
---

# LLM + MCP + RAG Demo

这个仓库是LLM+MCP+RAG的demo
为了尽量避免框架的抽象，采用无框架设计

来自于开源项目 https://github.com/KelvinQiu802/llm-mcp-rag

之前从来没有完整实现过这3个功能
花了2天在B站跟着敲了一遍，一边敲一边理解整体的思路



## 项目结构

这是一个TypeScript写的简易Agent+MCP+RAG项目
首先梳理一遍项目结构

1. **index.ts** — 负责入口编排，创建两个MCP client、做RAG检索、创建Agent并执行任务。

2. **ChatOpenAi.ts** — 封装了Openai的SDK，维护messages、流式输出、收集tool calls、并且吧MCP tools转成OpenAI tools格式

3. **MCPClient.ts** — 一个通用的MCP客户端封装；

4. **Agent.ts** — 胶水类 把LLM和MCP tools串起来，LLM产生tool call，Agent找到对应MCP client执行，再把结果塞回LLM，循环直到没有工具调用

5. **EmbeddingRestrivers.ts** — 向量化模块，是RAG的核心功能
负责调用embedding接口，把文档和query向量化，并从向量库查相关内容。

6. **VectorStore.ts** — 内存向量库，不能持久化，用数组保存`{embedding, document}` 查询时算余弦值相似度并返回topK(相关文档)

7. **.env** 需要四个变量，分别是

```env
# llm模型的API
OPENAI_API_KEY
OPENAI_BASE_URL

# 嵌入模型的API
EMBEDDING_KEY
EMBEDDING_BASE_URL
```

---
