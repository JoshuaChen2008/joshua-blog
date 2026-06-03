---
title: "Leetcode前置知识笔记"
description: "在B站学习的Leetcode的一些数据结构的基础概念和常用语法"
date: 2026-04-28
accentColor: "#4891B2"
tags: ["LeetCode"]
type: "note"
status: "ready"
draft: false
---

# Leetcode 前置知识

## 1. 集合（Set）

> 所有的元素都是**唯一的**，底层基于哈希表。

### 查

```python
"abc" in a  # -> True
```

### 增

```python
a.add(1)    # -> {1, 1.5, "abc"}  （还是1，因为里面已经有了1）
a.add(2)    # -> {1, 2, 1.5, "abc"}
```

> 存东西时是**无序**的。

```python
a.update([1])       # -> {1, 1.5, "abc"}
a.update([4, 5])    # -> {1, 2, 1.5, "abc", 4, 5}  （可以一次性加多个元素）
```

### 删

```python
a.pop()             # 在 set 里是随机删一个，没太大意义
a.remove(2)         # -> {1, 1.5, ...}
```

### 常用函数

`len()` / `max()` / `min()`

### 集合运算

```python
a = {1, 2, 3}
b = {2, 5, 9}
```

| 运算       | 含义                  | 结果                |
| -------- | ------------------- | ----------------- |
| `a - b`  | a 有但 b 没有的元素（差集）    | `{1, 3}`          |
| `a \| b` | a 有或 b 有（并集 A∪B）    | `{1, 2, 3, 5, 9}` |
| `a & b`  | a 有并且 b 有（交集）       | `{2}`             |
| `a ^ b`  | a 和 b 不同时有的元素（对称差集） | `{1, 3, 5, 9}`    |

---

## 2. 字典（Dictionary）

```python
{"name": "Learning", "age": 18}
# key = value
```

### 查

```python
dict["name"]      # -> "Learning"
dict["age"]       # -> 18
```

### 增

```python
dict["platform"] = "YouTube"
```

### 改

```python
dict["platform"] = "Bilibili"
```

### 删

```python
dict.pop("platform")
dict.pop(k)       # 删除指定 key
```

### 遍历

```python
dict = {"name": "Stay with Learning", "age": 18}
```

**判断 key 是否存在：**

```python
"name" in dict    # -> True
k in dict         # -> True / False
```

**遍历所有 key：**

```python
for key in dict:
    print(key)
```

**遍历所有 value：**

```python
for value in dict.values():
    print(value)
```

**遍历 key-value 对：**

```python
for k, v in dict.items():
    print(k, v)
```

---

## 3. 字符串（String）

```python
s = "hello world"
# 由一个个 "h" "e" "l" ... 字符组成
```

### 索引与切片

```python
s[0]        # -> 'h'
s[-1]       # -> 'd'
s[:]        # -> "hello world"
s[0:4]      # -> "Hell"  （实际上只打印索引 0~3）
```

### 常用函数

#### `len()`

```python
len(s)      # -> 11  （空格也算字符）
```

#### 大小写判断

```python
s.upper()       # 全部变成大写并返回
s.isupper()     # 全是大写字母返回 True，否则返回 False
s.lower()       # 全部变成小写并返回
s.islower()     # 相反，判断是否全小写
s.swapcase()    # 大写变小写，小写变大写
```

#### 数字判断

```python
s.isdigit()     # 全是数字返回 True
```

#### 统计

```python
s.count("l")    # -> 3
```

#### 去除空格

```python
s.strip()       # 去掉前后空格并返回
s.lstrip()      # 只去左边的空格
s.rstrip()      # 只去右边的空格
```

#### 替换与分割

```python
s.replace("hello", "hi")    # -> "hi world"

s.split(" ")                # -> ["hello", "world"]
```

---

## 4. 树（Tree）

> 待补充...
