---
title: 'Pi-mono'
description: 'Pimono 笔记'
date: 2026-06-04
accentColor: '#83d5d0'
tags: ["Agent"]
type: "note"
status: 'in-progress'
heroImage: { src: './kibou3-cover.webp', color: '#83d5d0' }
draft: false
---

# Monorepo 拆解

Monorepo和MultiRepo是一种项目代码管理方式
Mono指单个仓库中管理多个项目，有助于简化代码共享，版本控制

package通常是项目的依赖说明，类似于蓝图

npm install 需要更换国内镜像源，已更换

---

### 第一步 创建Cli并且调用api进行回答

核心是 `cli.ts` 和 `tsconfig` 等配置文件

#### cli.ts 语法解读

**1. `process.argv`**

获取用户在命令行里面输入的东西

```bash
process.argv.slice(2).join("")
```

`slice` 是指去掉前面 `argv` 获取到的数组里面前俩个元素。
因为通过 `npx tsx src/cli.ts "解释xxx"` 启动得到的是：

```json
[
  "C:\\Program Files\\nodejs\\node.exe",
  "D:\\AgentProject\\FirstAgent\\my-agent\\src\\cli.ts",
  "解释一下 TypeScript"
]
```

**2. `process.env`**

读取环境变量，例如 `process.env.DEEPSEEK_API_KEY` 读取环境中设置的api。

```powershell
$env:DEEPSEEK_API_KEY="XXX"
```

则是临时设置当前环境中deepseek这个环境的数值。

**3. `if (!xxx)`**

如果xx不存在的时候。

**4. `console.error("xxx")`**

手动打印错误提示，然后手动退出。
与异常处理机制不一样。

**5. `process.exit(1)`**

退出进程。

**6. `new OpenAI(...)`**

创建一个OpenAI类的实例对象，类似于Java的new。

**7. `await`**

等待这个异步操作完成，例如：

```typescript
await client.chat.completions.create(...)
```

等待Deepseek的api调用完成。

**8. `client.chat.completions.create(...)`**

由于前面 `const client = new OpenAI` 了，所以这里 `client.chat` 是指调用Openai里面的chat组件。

- `chat.completions` — 聊天补全，根据消息生成回答
- `chat.completions.create()` — 创建一次聊天请求

整体意思是：请 DeepSeek 根据我给你的 messages，生成一次回答。

这里是 message 对话消息数组里面每条消息的规范，是官方文档规定 `chat/completions` 接口需要传 `model` 和 `messages`：

```json
{
  "role": "system",
  "content": "你是一个耐心、清晰的中文编程助手。"
}
```

**9. `console.log(..)`**

把内容输出到控制台/终端里。

**10. `completion.choices[0].message.content`**

从接口返回结果 `completion` 里，取 `choices` 数组的第1个候选结果，再取这个候选结果里的 `message`，再取 `message` 里的 `content` 文本。

安全写法：

```typescript
console.log(completion.choices[0]?.message?.content ?? "");
```

如果 `choices[0]` 或 `message` 不存在，就不要报错，打印空字符串。

---

### 第二步 让对话持久化

**1. 定义存储记忆的 `messages` 数组**

```typescript
const messages: ChatCompletionMessageParam[] = [...]
```

定义一个 `messages` 数组，数组里的每一项都必须符合 `ChatCompletionMessageParam` 这种聊天消息格式。

**2. 创建命令行读写接口**

让程序可以反复从命令行读取用户输入，并把提示文字输出到命令行。

```typescript
const rl = readline.createInterface({ input, output });
```

```typescript
await rl.question("你: ")
```

**3. 把对话放进 message 数组**

```typescript
messages.push({
    role: "user",
    content: question,
})
```

意思是：把我的消息以 `{ role: "user", content: question }` 这种对象格式放进 `messages` 数组里。

模型回答后，也会被加入数组：

```typescript
messages.push({
  role: "assistant",
  content: answer,
});
```

**4. 创建聊天补全请求，把 messages 打包发给大模型**

```typescript
client.chat.completions.create({
    model: "deepseek-v4-flash",
    messages
});
```

让模型有记忆的核心是：

```typescript
const messages: ChatCompletionMessageParam[] = [{}];
```

以及每一轮俩次的 `messages.push`，和请求时传入完整历史：

```typescript
const completion = await client.chat.completions.create()
```

实现了：保存历史 → 追加新消息 → 每次请求带上完整历史

也就是说，这里 `message` 负责了记忆上下文，而其中 `ChatCompletionMessageParam` 主要是TypeScript类型检查，告诉代码 `messages` 数组里面每一项都应该是合法的聊天信息（Openai SDK接口定义的）。

### 第三步
