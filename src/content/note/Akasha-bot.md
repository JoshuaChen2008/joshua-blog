---
title: "奶龙项目 · 技术问题整理"
description: "AkashaBot的一些技术问题整理"
date: 2026-08-01
tags: ["Agent","Python"]
type: "note"
status: "in-progress"
draft: false
comment: true
---

> [!summary] 进度概览
> - ✅ **已回答**：3、5、7、14、15、16、17、18、20、21、24
> - ⬜ **待回答**：1、2、4、6、8、9、10、11、12、13、19、22、23

---

## 1. 依赖注入和 Protocol 的写法

> [!todo] 待回答

---

## 2. FastAPI 全局锁

> [!todo] 待回答

---

## 3. Runtime 解释

`PassiveMessageWorker` 从所有渠道共用的 MessageBus 取消息，并按照 `session_key` 为不同会话建立队列，保证同一会话的消息串行处理。Worker 将 `InboundMessage` 转换成 `TurnRequest` 并交给 `ConversationRuntime`。

Runtime 为请求创建带唯一 ID 的 `TurnRecord`，初始状态为 `QUEUED`，然后让后台任务等待真正的全局 `_admission` 锁。获得锁后，状态通过 CAS 从 `QUEUED` 更新为 `IN_PROGRESS`，并调用 AI 核心。

`TurnHandle` 可以读取记录、等待结果、订阅事件或请求中断。执行成功、失败、取消或中断后，Runtime 更新同一条数据库记录并发布对应事件；Worker 再把结果或内部失败转换成适合用户看到的出站消息。

中断通过 `task.cancel()` 协作式取消异步任务，并最终记录为 `INTERRUPTED` 或 `CANCELLED`。

---

## 4. 怎么订阅事件 / 插件如何注入

> [!todo] 待回答

### 4b. 插件有四类，那四类插件分别是怎么注入的，源码如何实现

> [!todo] 待回答

---

## 5. 插件热切换 / 启停

通过**快照机制**实现。

---

## 6. KV 机制是什么

> [!todo] 待回答

---

## 7. Prefill（预填充）

> **Prefill 就是：模型先把整段输入 Prompt 从头到尾"读一遍"，为每个 token 计算并保存注意力所需的 KV 状态，然后才开始生成回答。**

一次推理分两阶段：

1. **Prefill 阶段**：并行处理输入内容
   `系统提示 + MEMORY.md + 历史对话 + 当前问题`

2. **Decode 阶段**：根据这些状态逐个生成输出 token。

Prompt Cache 缓存的主要就是 **Prefill 产生的 KV 状态**。命中缓存后，模型不必重新读取那段相同前缀：

```
未命中：输入前缀 → 重新 Prefill → 开始生成
命中：  输入前缀 → 读取缓存 KV → 开始生成
```

所以 MEMORY.md 中途变化时，从变化位置开始的 KV 状态都依赖了不同的前文，必须重新 Prefill。

---

## 8. 优化后的 Prompt 系统对 Cache 缓存命中率的提升如何做 Eval

> [!todo] 待完善

参考链接：https://chatgpt.com/share/6a59e072-6e90-83ec-be58-092821a88721

---

## 9. 记忆系统是怎么插入整个系统的

> [!todo] 待回答

---

## 10. Responses 和 Completions 的区别

> [!todo] 待回答

---

## 11. SSE 和 WebSocket 的区别以及优劣

> [!todo] 待回答

---

## 12. 上下文降级机制为什么卡在 80% 才开始降级

> [!todo] 待回答
>
> 关键子问题：为什么是 80%？可以是其他数值吗？有什么证据支撑这个数值？

---

## 13. 上下文压缩机制在工程上是如何实现的

> [!todo] 待回答

---

## 14. 上下文管理机制：前置预防与事后降级

上下文管理有两套机制：

**前置预防**
估算达到阈值时（即下一轮调用之前），会终止当前循环并进行阶段性总结，然后终止 Agent Loop，不动上下文。

**事后降级**
真正触发 `ContextLengthError` 时，逐级裁剪 section，砍历史然后重试，是兜底机制。

---

## 15. 会话级工具 LRU

"会话级工具 LRU"可以拆成三部分理解：

| 概念 | 含义 |
|------|------|
| 会话级 | 每个聊天会话单独记录 |
| 工具 | 记录这个会话最近解锁或使用过的工具 |
| LRU | 容量满时，淘汰最久没使用的工具 |

---

## 16. 流式预览方案

"流式预览，完成后替换为正式内容"方向是对的；但不建议维护两个独立 JSON。更稳的方案是：

```
Provider 流式事件
    ↓
Agent Loop 累积完整原文
    ↓
Telegram 定时编辑预览消息
    ↓
完成后格式化原文并替换预览
```

---

## 17. 异步事件流

```python
async for event in provider.stream_reply(messages):
    ...
```

它会随着数据到达逐个产生事件：

```
请求 → 收到事件 1 → 收到事件 2 → 收到事件 3 → 完成事件
```

这里的"异步"表示：

- 等待网络数据时，不阻塞整个程序
- 其他用户的消息仍然可以被处理
- 数据到达一部分，就可以处理一部分

它**不是**指一定要多线程。

---

## 18. 为什么同一会话要串行（FIFO）

### 问题根源

假设用户连续发送两条消息：

```
消息 A：帮我查一下天气
消息 B：那明天呢？
```

如果同时处理：

```
请求 A ──────────────── 完成
请求 B ─────── 完成
```

可能出现：

- 请求 B 先读到旧的对话历史
- B 先生成回复，A 后生成回复
- 两条流式回复同时编辑同一条消息
- 用户看到两段文字交错

例如：

```
A：今天北京
B：明天北京
A：天气晴朗
B：可能下雨
```

这就是"历史顺序错乱"和"流式回复交叉"。

### FIFO 是什么

```
First In, First Out
先进入队列的任务先执行
```

同一个会话变成：

```
消息 A → 处理完成 → 消息 B → 处理完成 → 消息 C
```

这样消息 B 一定能看到 A 处理后的最新历史。

### 不同会话为什么可以并发

用户甲和用户乙互不相关：

```
用户甲：请求 A ─────── 完成
用户乙：请求 B ───── 完成
```

这两个请求可以同时执行，不需要互相等待。

整体效果是：

```
同一 ConversationKey：串行 FIFO
不同 ConversationKey：并发执行
```

### 代码实现概念

最简单的形式——每个会话一个锁：

```python
from collections import defaultdict
import asyncio

conversation_locks = defaultdict(asyncio.Lock)

async def handle_message(conversation_key: str, message: str):
    async with conversation_locks[conversation_key]:
        return await process_message(message)
```

同一个 key 会等待前一个任务释放锁，不同 key 使用不同的锁，所以可以并发。

如果要严格管理排队顺序，可以为每个会话建立 `asyncio.Queue` 和一个 worker。

### 这个设计的代价

同一会话里，如果第一条请求很慢，后面的消息也要等待。因此以后可以增加：

- 超时
- 取消上一条生成
- 队列长度限制
- "用户正在生成时合并新消息"

但对于基础聊天机器人，**ConversationKey 串行 FIFO 是值得接受的默认设计**，因为它能保证对话历史和回复顺序正确。

### 补充问答（asyncio / Lock 相关）

**1. 被动链路是不是类型化事件协议？**

大方向是类型化、事件驱动，但更准确是：

```
Telegram Update
→ InboundMessage
→ MessageBus
→ TurnState / 生命周期事件
→ LLM + Tool Loop
→ OutboundMessage
```

不是所有东西都先转成一个统一的 `TurnEvent`。

**2. 项目是否用全局锁控制会话顺序？**

不是单独一把"每会话锁"，而是三层配合：

```
每会话 FIFO 队列：保证同会话顺序
active_by_thread：记录会话当前 owner
全局 _admission 锁：当前所有会话实际只能一个 Turn 执行
```

**3. `asyncio.Lock` 到底怎么工作？**

```python
async with lock:
    ...
```

表示先获取锁，执行完自动释放。拿不到锁的协程会暂停等待，不会阻塞整个事件循环。当前项目的全局锁会覆盖完整的 LLM / Tool Turn。

**4. 什么是"消费任务"？**

每个会话有一个后台 `asyncio.Task`，不断从自己的队列中取消息：

```python
while True:
    item = await queue.get()
    await self._run_message(item)
```

它像一个会话专属的"收件员"，不是线程，也不是消息本身。

**5. 为什么之前的两行代码比文件源码短？**

那两行只是主干摘要。真实源码还包含：

```
普通消息 / 内部消息分支
异常处理
任务取消处理
队列为空时的清理
旧链路兼容处理
```

**6. `cast`、`key`、`self._lane_tasks`、`asyncio.Queue()`、f-string 分别是什么？**

| 符号 | 含义 |
|------|------|
| `cast` | 给类型检查器看的提示，不会真的转换对象 |
| `key` | 会话 ID，例如 `"telegram:42"` |
| `self._lane_tasks` | 当前 Worker 保存的"会话 ID → 消费任务"字典 |
| `asyncio.Queue()` | 异步先进先出队列 |
| `f"passive-lane:{key}"` | 格式化字符串，例如结果是 `"passive-lane:telegram:42"`，主要用于任务调试名称 |

**7. 队列为空时怎么清理？**

```python
self._lane_tasks.pop(key)
self._lane_queues.pop(key)
return
```

`pop(key)` 从字典删除对应记录；`return` 结束当前 `_run_lane()` 任务。这样没有消息的会话不会一直占用内存。

**8. 为什么源码里大量出现 `self`？**

`self` 表示当前对象本身。例如：

```python
worker._enqueue(item)
# Python 可以理解为：
PassiveMessageWorker._enqueue(worker, item)
```

所以方法里的 `self` 就是 `worker`。在当前项目中，A/B 会话通常共享同一个 Worker，区别由 `key` 表示。

**9. `__init__` 是什么？**

对象创建时自动调用的初始化方法：

```python
class SomeClass:
    def __init__(self):
        self.value = 0
```

它负责给对象准备初始状态。项目中的 `_lane_tasks`、`_lane_queues` 等属性就是在初始化阶段创建的。

### 整体心智模型

```
Telegram 消息
→ 放入 MessageBus
→ 按 session_key 分到会话 Queue
→ 每个会话的 asyncio Task 消费 Queue
→ ConversationRuntime 做会话占用和全局准入
→ AgentLoop 执行 LLM / Tool
→ 返回消息并清理状态
```

---

## 19. 滑动窗口的工程实现及去重处理链路

> [!todo] 待回答

---

## 20. 图片在交互层与 Agent Loop 之间如何传递

### 核心机制

图片以**本地文件路径**穿过交互层、消息总线和 AgentLoop，只有在 Prompt 渲染（即将调用模型的时候），才转为 **Base64 图片块**。

**设计原因：**
- 避免把大图片复制进消息队列和控制层
- 渠道只负责保存文件
- Agent / Provider 层负责决定如何适配模型

### 完整流程

**第一步：** 交互层传入图片路径

```python
media = ["D:/workspace/uploads/photo.png"]
```

**第二步：** 经过 `InboundMessage`、`TurnRequest` 后，AgentLoop 收到

```python
InboundMessage(
    content="请描述这张图",
    media=["D:/workspace/uploads/photo.png"],
)
```

**第三步：** 实际调用模型前，将图片转成 Base64 并拼成 Data URI

```
data:image/png;base64,iVBORw0KGgoAAA...
```

**第四步：** 最终变为 Chat Completions 风格的消息

```json
{
    "role": "user",
    "content": [
        {
            "type": "image_url",
            "image_url": {
                "url": "data:image/png;base64,iVBORw0KGgoAAA..."
            }
        },
        {
            "type": "text",
            "text": "请描述这张图"
        }
    ]
}
```

> Base64 放在 `image_url` 字段中，模型 API 看到这个结构后会将 Data URI 当做图片输入，**不是**让模型当普通文字阅读。
>
> 如果本来就是远程 URL，则不会再次 Base64 编码。

### Base64 的意义

- 让图片内容可以嵌入 JSON / HTTP 请求
- 让远程模型服务能够收到本地图片内容
- 配合 `image_url` 和 MIME 类型，让模型 API 知道这是图片

它**不是**：OCR、图片理解、加密、压缩。注意 Base64 会让数据体积增加约 **1/3**。

### 媒体引用层抽象

设计一个媒体引用层，使得 Telegram、QQ 图片等不同格式可以统一为 `media: list[str]`，使得图片可以被直接重复引用，出站后再转换，达到多渠道复用的效果。

### 图片传输逻辑（UploadStorage 设计）

使用随机 UUID 文件名，但扩展名来自渠道层提供的提示信息（不保证经过真实内容验证）；渠道层尽量接收，单个失败记录日志并继续，不让一个坏附件影响整条消息。部分场景在后续使用时再进行内容校验。

当前渠道采用**边下载、边落盘**的设计：

1. `storage.begin(...)` 创建一个临时上传会话
2. 网络层异步接收数据块
3. 每收到一块就同步写入文件并累计大小，不把整张图片放进内存
4. 全部写完后调用 `commit()`，生成正式存储记录和 `media://...` 引用
5. 中途失败则清理临时文件，不提交半成品
6. 若 Web 已有完整 bytes，则一次性写入

> **核心目标**：控制内存占用，同时让存储层保持简单。
> **注意**：大文件同步写入可能短暂阻塞异步事件循环。

`UploadStorage` 是"上传内容存储层"，负责保存用户上传的图片、文件等原始数据，并返回一个不透明的媒体引用。例如：

```
Telegram 图片
  → 下载图片 bytes
  → UploadStorage 保存
  → 返回 media://01KABC...
  → InboundMessage 只携带这个引用
```

### 图片识别调用逻辑

主模型无法直接看图时，通过 VL 工具间接处理：

```
主模型无法直接看图
    ↓
上下文提示：调用 read_image_vision
    ↓
主模型发出 tool_call
    ↓
工具内部 await VL Provider
    ↓
得到 VL 文本或错误文本
    ↓
包装成 role="tool" 的 tool_result
    ↓
放回上下文
    ↓
主模型继续推理或再次调用工具
```

---

## 21. VL 工具返回 Agent 的为什么是普通字符串而不是结构化 JSON

因为当前的 VL 工具定位是"通用视觉问答工具"，不是固定字段的图片解析接口。

```
Provider 的 JSON HTTP 响应
    ↓
统一成 LLMResponse
    ↓
取 response.content
    ↓
作为普通文本返回给 Agent
```

**优点：**

- 支持任意 Prompt，例如描述图片、识别文字、比较物体、回答问题
- 不要求所有 VL 模型都输出相同 JSON 结构
- 避免模型输出不完整或格式错误的 JSON 导致工具失败
- 与普通 LLM 的文本响应一致
- Provider 的 HTTP 协议不会泄露到 Agent 层

> **注：** 当前 JSON 解析由 Provider 层进行。

**代价：**

- Agent 无法稳定按字段读取结果
- JSON 样式的输出不会自动校验
- 不适合固定结构的 OCR、坐标检测或图片分类

**结论：** 这个设计适合自然语言视觉问答。如果以后需要机器稳定消费结果，需要增加结构化的 VL 接口——定义 Pydantic Schema，让特定任务返回经过校验的 JSON，而不必改变现有的通用文本接口。后续增加论文提取插件等流程化插件时可以参考此思路。

> [!note] 工具结果脱敏
> 返回的工具结果会做限制并脱敏，防止 API Key 泄露到模型 content 里面。

---

## 22. 什么是 Schema / Schema 由 Tool 声明是什么样

> [!todo] 待回答

**相关背景：** "通用 Schema 校验"本质上是后端的"输入边界校验 / 契约校验"思维。核心逻辑是：

```
外部输入默认不可信
    ↓
先校验结构 Schema
    ↓
转换成可信的内部参数
    ↓
再进入业务逻辑
```

---

## 23. 取消意图的过程是什么

> [!todo] 待回答
>
> 关键子问题：
> - 一共几种取消意图？
> - 取消指令是如何传达的？
> - 对 Turn 内部产生了什么影响？
> - 边界情况：如果内部代码捕获并吞掉 `CancelledError`，随后正常返回，`ConversationRuntime` 就不会收到取消确认，这种情况怎么处理？

---

## 24. 签名的设计含义（TurnHandle.result 的返回类型）

函数签名是：

```python
async def result(self) -> TurnRecord:
    """等待 Turn 结束并返回最终记录。"""
```

它可以拆成四部分：

| 部分 | 含义 |
|------|------|
| `async def` | 异步方法，调用后需要 `await` |
| `result` | 方法名，表示等待 Turn 完成 |
| `self` | 当前 `TurnHandle` 对象本身 |
| `-> TurnRecord` | 返回值类型是 `TurnRecord` |

调用方式：

```python
record = await handle.result()
```

### 为什么固定返回 TurnRecord 而不是 `str | None | Exception`

**固定返回 `TurnRecord` 的好处：**

无论哪种情况，`record` 都是 `TurnRecord`，调用方知道它一定有：

```python
record.status
record.result
record.error_text
```

**如果返回 `str | None | Exception`，调用方必须猜测类型：**

```python
async def result() -> str | None | Exception:
    ...

value = await handle.result()

if isinstance(value, str):
    send(value)
elif value is None:
    send("没有结果")
elif isinstance(value, Exception):
    handle_error(value)
```

**更常见的混合方式** 是返回 `str | None` + 失败时抛出异常：

```python
async def result() -> str | None:
    ...
# 失败时抛出 TurnFailedError / CancelledError
```

于是调用方同时要处理返回值和异常：

```python
try:
    value = await handle.result()
    if value is not None:
        send(value)
except TurnFailedError:
    ...
except asyncio.CancelledError:
    ...
```

**固定返回 `TurnRecord` 的设计原则：**

```
返回类型始终相同
业务差异放到 record.status
```

仍然需要 `if`，但这个 `if` 判断的是明确的业务状态，不是判断返回值到底是字符串、空值还是异常对象。

> 这里的"固定"不是 Python 强制要求，而是项目定义的稳定接口约定。




## 设计伏笔：当前项目内部声明周期采用不可变的具名类型，而不是通用dict
而且JSON只在渠道或插件边界转换

具名类型好处是稳定，但是缺少灵活性，例如后续针对事件生命周期做可干预的HOOK没法操作
后续可能要更换



## 中途刹车，收缩为MVP

初版先实现核心执行能力；事件流只保留最必要的事件类型。工具、Memory、Phase 和主动任务是否对外暴露事件，等真正需要监控、调试、插件干预或流式展示时再添加。


## TurnExcutor

TurnExcutor是ConversationRuntime调用AgentLoop的统一接口

整个项目执行一轮会话的有俩个模块

ConversationRuntime：负责 Turn 的生命周期和最终状态
AgentLoop：负责真正执行一轮对话
可以把 ConversationRuntime 理解成“裁判”，把 AgentLoop 理解成“执行者”。

正常执行流程是：
```
ConversationRuntime 创建 Turn
        ↓
启动内部 asyncio.Task
        ↓
调用 TurnExecutor.execute()
        ↓
AgentLoop 执行模型和工具
        ↓
AgentLoop 发布 ThinkingDelta / ContentDelta
        ↓
AgentLoop 返回完整正文字符串
        ↓
ConversationRuntime 创建并持久化 TurnRecord
        ↓
ConversationRuntime 发布 turn/finished
```

### 为什么 AgentLoop 不能创建终态

如果 AgentLoop 自己创建 `TurnCommitted` 或修改 Turn 状态，可能出现：

```
AgentLoop 认为完成
    ↓
工具清理失败
    ↓
Runtime 还没有持久化
```

这会导致：

- 状态提交顺序混乱；
- 取消和失败逻辑分散；
- 工具关闭失败无法统一记录；
- Runtime Failure 和普通 Turn Failure 难以区分；
- 同一个 Turn 可能被提交两次。

所以只有 ConversationRuntime 可以决定：

```
COMPLETED
FAILED
CANCELLED
INTERRUPTED
```

AgentLoop 只能：

- 正常返回最终正文；
- 发布过程增量；
- 抛出异常；
- 响应取消。

## 防止事件订阅发生竞态的处理
```
handle = runtime.submit(snapshot)  # 同步创建并排队
events = handle.events()           # 同步注册订阅
record = await handle.result()     # 此后事件循环才执行 Turn
```


## 设计伏笔：当前存在晚订阅导致错过早期事件的问题
```
事件流：可能因为晚订阅而不完整
TurnRecord：负责保证最终业务结果
```

当前 MVP 允许这种情况，是因为 live-only 模式不保存历史事件，结构简单、内存开销低。

正常调用方应当使用：

```
handle = runtime.submit(snapshot)
events = handle.events()
record = await handle.result()
```

只有调用方明确延迟订阅时，才接受错过早期事件。如果未来要求晚加入也能收到完整过程，就必须增加事件缓冲或回放机制。

## Prompt架构设计
把 System Prompt 当成一个“运行时上下文编译器”

稳定规则 / 身份 / 工具协议
        ↓  static cache
工作区 / 技能目录 / session 信息
        ↓
记忆 / 检索结果 / 当前激活技能
        ↓  按需裁剪、组合
最终 messages

这样设计的好处：
1.可以区分稳定内容和动态内容
例如，身份和行为规则通常很少变化，而记忆，检索结果，激活技能等每轮都会变化，可以通过is_static区分两类内容，并为block设置独立的cache signature
以避免每轮重新构造所有内容，也有利于模型服务商对稳定前缀做prompt caching，项目自身的sectionCache是进程内渲染缓存，不等同于Provider的token cache

2.保证Prompt顺序明确
Prompt的顺序会影响模型理解，身份和行为规则应该优先于记忆，priority把顺序从列表碰巧排成这样变成了明确契约
这样也方便插件在顶部或者底部注入呢日，而不用修改AgentLoop的主流程

3.可以按区块裁剪上下文，上下文过长的时候，可以按名称禁用某些section，而不是只能截断整段Prompt，这对长对话Agent很重要


4.更容易观测和调试，每个block都可以记录字符数，估算token数，是否静态，是否命中缓存等数据，可以观测到到底是哪一块Prompt变长了，而不是只看见一个无法分析的大字符串

5.可以降低模块耦合，AgentLoop不需要知道人格，记忆，技能，Telegrame格式等细节，只负责驱动执行流程
Prompt组装由ContextBuilder和SystemPromptBuilder负责


### 和其他方案的比较

| 方案              | 优点                   | 缺点                                         |
| --------------- | -------------------- | ------------------------------------------ |
| 一个巨大的硬编码 Prompt | 简单、直观、早期开发快          | 动态内容难插入，无法按模块裁剪，容易和 AgentLoop 耦合           |
| 环境变量            | 部署时容易覆盖              | 不适合长文本、多段结构、优先级、缓存和运行时数据；难以测试、review 和版本管理 |
| PromptBlock 架构  | 支持动态组合、缓存、裁剪、插件扩展和调试 | 初期代码量更大，需要维护 block 接口和顺序契约                 |

环境变量适合填写API Key，模型名，feature flag和少量部署级的覆盖项，不适合承载完整的Agent Prompt，长Prompt在环境变量里面还会遇到行转义，引号，容器注入，安全审计等问题

LangChain，Letta(具有高级记忆能力的Agent)等开源项目也是这样设计的
