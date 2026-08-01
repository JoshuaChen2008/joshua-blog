---
title: "面试知识补充-Python八股"
description: "记录一下Python的一些基础知识"
date: 2026-08-01
tags: ["interview","python","八股文"]
type: "note"
status: "ready"
draft: false
comment: true
---

## 1. Python 的基本数据类型

Number 数字，String 字符串，Bool 布尔类型，List 列表，Tuple 元组，Set 集合，Dictionary 字典

其中，不可变数据：Number、String、Bool、Tuple
可变：List、Dictionary、Set

## 2. Python 的解释器和编译器的区别是什么

**解释器**：逐行执行代码，每次执行的时候都需要解释，这意味着代码直接运行，无需先编译。Python 通常被认为是一种解释性语言，因为 Python 在执行时会被解释器逐行转为机器码，这使得开发过程更加灵活，但是牺牲了速度。

**编译器**：将源码整体编译成机器语言代码，然后执行，这个过程只发生一次，之后可以直接运行编译后的代码，通常运行速度比解释执行快，例如 C 和 Java。

这句话是直接抄的，翻译一下就是：
```text
Java：先证明这段操作在类型规则上基本合理，再允许运行。
Python：先确认语法合法，运行时再看当前对象能不能完成这个操作。
```

## 3. 深拷贝和浅拷贝

**浅拷贝**：创建一个新的对象，但是包含原始对象中包含的引用。
**深拷贝**：创建一个新的对象，并且递归复制原始对象中的所有项，包括复合对象以及其中包含的所有子对象。

由于深拷贝会复制对象中包含的所有子对象，如果对象结构非常大，这可能会导致性能问题。

换句话说就是：
```text
浅拷贝会创建一个新的外层对象，但外层对象中的子对象引用仍指向原来的子对象。
因此修改共享子对象会同时影响两边；如果只是将原对象中的某个引用重新指向另一个对象，则不会影响复制对象。
深拷贝则会递归复制内部子对象，因此两边通常互相独立。
```

## 4. Python 如何管理内存

Python 使用自动内存管理和垃圾回收机制来帮助程序员管理内存，主要机制包括：

- **引用计数**：Python 内部维护了一个引用计数器，用来确保对象被需要时保存在内存中，不再需要时释放。
- **垃圾回收**：对于循环引用的情况，引用计数器无能为力，因此 Python 的垃圾回收器会定期运行，检测并且清除循环引用的对象。

解释一下：函数结束时，局部引用会被移除；对象是否销毁，要看还有没有其他引用指向它。

例如局部变量：
```python
def test():
    data = [1, 2, 3]
```
调用 `test()` 的时候，局部变量 data 引用列表对象，函数结束以后局部变量 data 被移除，因此列表的对象引用计数减 1，若计数为 0 就会释放。

```python
def test():
    data = [1, 2, 3]
    return data

result = test()
```
这种情况，result 会保存 test 的结果，因此引用会从 `test() -> data` 变成 `result -> data`，所以这时候对象仍然存在。

### 循环引用

```python
a = []
b = []

a.append(b)
b.append(a)
```

这里删除外部变量 a 和 b 以后，内部仍然互相引用：

```text
列表A ──→ 列表B
  ↑          │
  └──────────┘
```

因此引用计数可能会变成列表 A 和列表 B 都为 1，单靠计数无法释放。
这里不是无限递增，而是两个对象互相撑住对方的引用计数，导致无法归零，这时候需要垃圾回收器。

### 垃圾回收器

垃圾回收器关心的是：这一组互相引用的对象，外部是否还能访问。
只要能从程序中仍在使用的引用走到它，就是**可达对象**，不能清理；如果没有任何引用就是**不可达对象**，可以清理。

#### 什么时候回收？

Python 用分代回收，根据对象分配和释放情况，在达到一定阈值以后触发检查。
新创建的对象为年轻代，如果存活较久则变为更老的一代。

循环垃圾回收主要关注可能形成引用环的容器对象，例如：

- List
- dict（字典）
- set
- 自定义类实例
- 其他能引用对象的容器

而整数、字符串等不可变对象一般不会形成类似的对象引用环。

## 5. GIL (Global Interpreter Lock) 是什么

GIL 是一个互斥锁，叫全局解释器锁，保证同一时刻只有一个线程可以执行 Python 字节码，这是因为 Python 解释器的内存管理并不是线程安全的。GIL 简化了 Python 的设计和实现，也限制了程序在多个处理器上的并行执行能力。

把一个普通的 Python 进程想象成一个工作室：

```text
           唯一的工作证：GIL
                    │
        ┌───────────┼───────────┐
        │           │           │
      线程 A      线程 B      线程 C
```

线程可以有很多个，但是要进入"执行 Python 字节码的工作区"，通常必须先拿到唯一的工作证：

```text
A 拿证执行 → 交还
B 拿证执行 → 交还
C 拿证执行 → 交还
```

遇到网络、文件等等待操作时，A 等待 I/O，先把工作证交出来，B 趁机执行 Python 代码。

也就是说：
> GIL 是常规 CPython 为保护解释器和 Python 对象内部状态而设置的一把全局锁，它让同一进程中通常只有一个线程执行 Python 字节码，因此限制了 CPU 密集型多线程的并行能力，但不会让 I/O 多线程失去价值，也不能代替业务层面的线程锁。

## 6. Python 的列表和元组有什么区别

- **列表 (List)**：动态数组，可变类型，可以增加、删除或者修改列表中的元素。
- **元组 (Tuple)**：不可变序列，一旦创建就不能修改，因为不可变性，元组可以作为字典的键，而列表不行。
- **字典 (dict)**：一种按照「键 → 值」保存数据的数据结构，相当于通讯录，一个姓名对应一个电话号码。

在 Python 中写成：
```python
contacts = {
    "张三": "13800",
    "李四": "13900",
}
```
这里张三是键（key），13800 是值（value），`张三: 13800` 是一组键值对。

### 字典用来干嘛？

列表通过位置查找元素：
```python
names = ["张三", "李四", "王五"]

print(names[0])  # 张三
```
这里要记住张三在第 0 个位置。

字典则通过名字或编号查找：
```python
user = {
    "name": "张三",
    "age": 18,
    "school": "天津理工大学",
}

print(user["name"])  # 张三
print(user["age"])   # 18
```

也就是说：
```text
列表：位置 → 数据
字典：键 → 数据
```

### 为什么列表不能作为字典的键？

因为字典要求键必须是**可哈希的**，可以理解为：字典的键必须是稳定且不会变化的，Python 才能快速定位它对应的值。

不可变类型（字符串、整数和元组）都可以作为键，但是列表是可变的。如果列表作为字典的键，字典刚刚把它记录在一个位置，列表内容又发生了变化，Python 就找不到它了。

> 注意：元组只有在内部所有元素都可哈希时，才能作为字典的键。比如元组内部还有一个列表的时候，就没法作为字典的键。

## 7. Python 的装饰器是什么

装饰器是一种特殊函数，用于在不修改原有函数代码的情况下增加新的功能，装饰器通过 `@` 符号使用，放在一个函数定义之前。

> 在不修改原函数代码的情况下，给函数额外增加一层行为。

最常见的用途包括：记录日志、检查登录权限、统计运行时间、参数校验、缓存结果、捕获异常。

例如，原函数是：
```python
def say_hello():
    print("你好")
```

现在希望它执行前后分别打印日志：
```text
开始执行
你好
执行结束
```

最直接的方式是修改原函数，但如果有 100 个函数要修改则会非常麻烦。这里装饰器的思路是：
```text
原函数
   ↓
套上一层公共外壳
   ↓
得到增强后的函数
```

写一个最基础的装饰器：
```python
def log_decorator(func):
    def wrapper():
        print("开始执行")
        func()
        print("执行结束")
    return wrapper
```

使用方法是：
```python
@log_decorator
def say_hello():
    print("你好")
```

直接调用 `say_hello()` 会依次输出：
```text
开始执行
你好
执行结束
```

这里的 `@log_decorator` 就是在给 `say_hello` 套上装饰器。

### 装饰器本质上做了什么？

装饰器写法是：
```python
@log_decorator
def say_hello():
    print("你好")
```

而手动写法是：
```python
def say_hello():
    print("你好")

say_hello = log_decorator(say_hello)
```

这里 `say_hello = log_decorator(say_hello)` 的过程是：
```text
原来的 say_hello 函数
          ↓
传给 log_decorator
          ↓
log_decorator 返回 wrapper
          ↓
变量 say_hello 改为指向 wrapper
```

所以装饰以后 `say_hello()` 实际上调用的是 `wrapper()`，然后 `wrapper` 内部又会调用原来的函数 `func()`。

为什么函数可以被传进去？因为在 Python 中，函数也是对象，可以把函数赋值给变量，也可以把函数作为参数，也可以从另一个函数中返回函数。

例如：
```python
def create_function():
    def inner():
        print("内部函数")
    return inner

func = create_function()
func()
```

这里 `inner` 是内部函数，调用 `create_function()` 会得到 `inner` 函数本身。

所以装饰器利用的就是这三个能力：**函数可以被传入、函数可以被保存、函数可以被返回**。

如果原函数需要参数，装饰器也必须接收这些参数。

### 通用装饰器：\*args 和 \*\*kwargs

如果装饰器不知道会接受多少参数，可以写：
```python
def log_decorator(func):
    def wrapper(*args, **kwargs):
        print("开始执行")
        result = func(*args, **kwargs)
        print("执行结束")
        return result
    return wrapper
```

这里 `*args` 收集位置参数，`**kwargs` 收集关键字参数。

一个完整的通用装饰器是：
```python
def decorator(func):
    def wrapper(*args, **kwargs):
        # 原函数执行前的逻辑

        result = func(*args, **kwargs)

        # 原函数执行后的逻辑

        return result

    return wrapper
```

这里一定要 `return`，否则原函数虽然会返回数值，但是 `wrapper` 这个外层函数不会把这个值继续返回出去。

这里用的也是闭包的特性。

### FastAPI 中的 \@app.get 也是装饰器

```python
@app.get("/users")
def get_users():
    return [{"name": "Joshua"}]
```

这里的 `@app.get("/users")` 就是带参数的装饰器，它做的事情大致是：把 `get_users` 函数注册为 `GET /users` 的处理函数。当服务器收到 `GET /users` 时，FastAPI 就知道要调用 `get_users()`。

因此装饰器不仅可以包裹函数，还可以在框架中完成注册、记录和配置。

### FastAPI 是如何用装饰器的

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class UserOut(BaseModel):
    id: int
    name: str


@app.get(
    "/users/{user_id}",
    response_model=UserOut,
    tags=["users"],
    status_code=200,
)
def get_user(user_id: int, detail: bool = False):
    return {
        "id": user_id,
        "name": "Joshua",
        "detail": detail,
    }
```

```text
@app.get(...) 不是在调用接口函数

而是在程序启动时填写一张路由登记表：

"以后谁带着 GET /users/123 来，
就把请求翻译成 Python 参数，
再交给 get_user 函数。"
```

注册 → 记录 → 配置

## 8. 生成器

一种不会一次性把所有结果都算出来，而是每次需要时才生产一个结果的对象。

核心关键词是 `yield`，做了什么？
> 返回一个结果，但先不要结束函数；把当前执行位置和局部变量保存下来，下次继续往下运行。

例如：
```python
def demo():
    print("开始")
    yield 10

    print("继续")
    yield 20

    print("结束")
```

调用 `g = demo()`，现在还不会打印任何内容。

**第一次**：`print(next(g))`
```text
进入函数
打印"开始"
遇到 yield 10
暂停
返回 10
```
输出：
```text
开始
10
```

**第二次**：`print(next(g))`
它不会重新从函数开头执行，而是从上次暂停的位置继续：
```text
打印"继续"
遇到 yield 20
暂停
返回 20
```

**第三次**：`next(g)`
继续执行：
```text
打印"结束"
函数运行完毕
```
然后抛出 `StopIteration`。

同时，生成器会保存运行状态：当前运行到哪一行、局部变量当前是多少、函数栈调用状态。因此它很像一个可以暂停和继续的函数。

### 为什么需要生成器？

最大的优势是：
> 节省内存，并且可以处理很大的数据流。

假设要生成一千万个数字，普通列表的写法是：
```python
numbers = [i for i in range(10_000_000)]
```

生成器则是：
```python
numbers = (i for i in range(10_000_000))
```

它不会一次性保存所有数字，而是记录生成规则：需要一个数字 → 计算一个 → 用完之后再计算下一个。因此内存占用通常小很多。

### 生成器也就是所谓的懒加载

所谓懒加载是：
> 不提前做，等真正需要的时候再做。

例如：
```python
def read_data():
    print("读取第一个数据")
    yield 1

    print("读取第二个数据")
    yield 2
```

如果我只读取第一个：
```python
g = read_data()
print(next(g))
```
第二部分根本不会执行。

很适合逐行读取大文件、分页读取数据库、网络数据流、大模型流式输出和数据处理管道等场景。

同时，生成器还有一个重要的特性：**生成器通常只能消费一次**。想要重新读，就要重新创建生成器。

比对列表和生成器：
```text
列表：数据已经存好了，可以重复读取

生成器：数据流经过一次，用完就结束
```

比对 `return` 和 `yield`：
```python
def test():
    return 1
    return 2  # 永远不会执行
```
第一个 `return` 执行后函数立刻结束，第二个永远不会执行。**返回结果并且结束函数**。

```python
def test():
    yield 1
    yield 2
```
第一次获取 1，函数暂停，下一次继续，获取 2。**产出结果并且暂停函数**。

### 举两个常见的 yield 例子

#### 1. 逐行读取大文件

普通写法：
```python
with open("large_file.txt", encoding="utf-8") as file:
    lines = file.readlines()
```
`readlines()` 会把所有行一次性放入列表，如果文件非常大，可能占用很多内存。

更常见的写法是：
```python
with open("large_file.txt", encoding="utf-8") as file:
    for line in file:
        print(line)
```
文件对象本身支持迭代，会一行一行读取，而不是一次性加载整个文件。

#### 2. 大模型流式输出

假设大模型逐块返回文字：
```python
def stream_answer():
    yield "Python"
    yield "生成器"
    yield "可以流式返回数据"
```

调用：
```python
for chunk in stream_answer():
    print(chunk, end="")
```

输出会逐块出现：`Python生成器可以流式返回数据`

Web 服务中的流式响应、SSE 和大模型的 Token 流，都可以用类似的思想。

### 生成器和迭代器的关系

> 生成器是一种特殊的迭代器。

生成器是包含 `yield` 的可暂停函数。它会保存上次执行状态，在需要时逐个生成数据，而不是一次性把所有结果存进内存。

## 9. 如何使用多线程

用 `threading` 模块来创建和启动多线程，尽管 Python 的 GIL 限制了线程的并行执行，但是在执行 I/O 密集型任务时，多线程仍能提高程序整体的效率。

## 10. Python 中的异常如何工作的

通过 `try`、`except`、`else` 和 `finally` 语块来处理异常：

- `try`：放置可能引发异常的代码
- `except`：处理异常
- `else`：没有异常时执行
- `finally`：无论是否发生异常都会执行

## 11. Python 中支持哪些类型的继承？

Python 支持**单继承**和**多继承**，单继承允许子类继承一个父类的属性和方法，而多继承允许子类同时继承多个父类。

## 12. 什么是鸭子类型

鸭子类型是动态类型的一种风格，它关注对象的行为而不是对象的类型，如果一个对象实现了所需的方法和属性，则它可以视为特定的类型。

## 13. 如何在 Python 中管理包和模块？

通过 `import` 语句导入模块和包，`pip` 是 Python 的包管理器，用于安装和管理第三方库。

## 14. Python 的 `__init__` 和 `__call__` 方法有什么不同

- `__init__`：类的构造方法，用于初始化新创建的对象。
- `__call__`：允许实例像函数那样被调用。

## 15. Python 的多态如何实现？

多态允许不同的类实例使用相同的方法名称，但实现可以不同。在 Python 中，多态是隐式的，因为 Python 是动态类型语言，不需要显式声明接口或者基类。

## 16. 如何优化 Python 代码的性能

- 使用更高效的数据结构
- 利用 Python 标准库中的内置函数
- 避免在循环中使用全局变量
- 使用列表推导式和生成器表达式
- 对于 CPU 密集型任务，考虑使用 `multiprocessing` 模块来利用多核 CPU
