# 友链维护

友链的唯一数据源是 `public/links.json`。普通友链只需要四个字段：

```json
{
  "name": "Cxin Blog",
  "desc": "AI Native",
  "link": "https://cxin.vercel.app/",
  "avatar": "https://cxin.vercel.app/favicon/android-chrome-512x512.png"
}
```

- `name`：网站名称。
- `desc`：一句话介绍。
- `link`：以 `http://` 或 `https://` 开头的完整地址。
- `avatar`：完整图片地址，或 `public` 目录下以 `/` 开头的路径。

将对象加入 `cf-links` 分组的 `link_list` 后，普通友链列表会自动生成。

## 加入 Ludus 动态区域

需要展示在页面顶部动态区域时，在标准四字段之外增加 `ludus`：

```json
{
  "name": "Example Blog",
  "desc": "An example friend",
  "link": "https://example.com/",
  "avatar": "https://example.com/avatar.png",
  "ludus": {
    "desktop": {
      "x": 20,
      "y": 18,
      "size": 96
    },
    "mobile": {
      "x": 0,
      "y": 42,
      "size": 80
    },
    "rotate": 7,
    "parallaxX": -60,
    "parallaxY": 40,
    "labelSide": "right",
    "zIndex": 1
  }
}
```

位置说明：

- `x`、`y` 使用百分比坐标，`50 / 50` 表示舞台中央。
- 坐标允许小于 `0` 或大于 `100`，可让卡片部分伸出边缘。
- `size` 默认 `96`。
- 移动端配置缺省时继承桌面配置。
- `rotate` 默认 `0`，单位为度。
- `parallaxX`、`parallaxY` 默认 `30`，单位为像素。
- `labelSide` 缺省时根据横坐标自动选择。
- `zIndex` 默认 `1`。

只要存在 `ludus` 字段，卡片就会进入动态区域；删除该字段后仍会保留在普通友链列表。

## 本站头像

本站交换头像位于：

```text
public/images/avatar.webp
```

部署后的稳定地址是：

```text
https://blog.joshua2008.top/images/avatar.webp
```

以后替换同名文件即可保持外部友链地址不变。

## 检查

修改后运行：

```shell
bun test
bun run check
bun run build
```

如果启用了头像缓存，再运行：

```shell
bun run cache:avatars
```
