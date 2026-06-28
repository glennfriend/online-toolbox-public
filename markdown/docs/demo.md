# 📘 Markdown 功能示範

> 這是**內建示範文件,不可刪除**。左側可「＋ 新增」自己的筆記。
> 以下是 markdown-it 加上幾個 plugin 之後的效果。

## 文字樣式

**粗體**、*斜體*、~~刪除線~~、`行內程式碼`、==螢光標記==、[超連結](https://markdown-it.github.io/)

裸網址自動連結:https://github.com/markdown-it/markdown-it

## 數學公式

行內 $a^2 + b^2 = c^2$,區塊:

$$
\int_0^1 x^2 \,dx = \frac{1}{3}
$$

## 標題(會自動加錨點 #)

### 第三層標題
#### 第四層標題

## 清單

- 無序項目
  - 巢狀項目
    - 再一層
- 第二項

1. 有序項目
2. 第二項
   1. 巢狀有序

## 引用

> 一層引用
>> 巢狀引用

## 表格(GFM,內建)

| 語言 | 用途 | 上色 |
|---|---|:---:|
| JavaScript | 前端 | ✅ |
| PHP | 後端 | ✅ |
| JSON | 資料 | ✅ |

## 程式碼(右上有語言名 + 複製鈕)

```js
const greet = (name) => `Hi, ${name}`;
console.log(greet("world"));
```

```json
{ "name": "demo", "ok": true, "n": 42 }
```

```php
<?php echo "hello " . strtoupper("world"); ?>
```

## 圖片

![badge](https://img.shields.io/badge/markdown--it-CommonMark-blue)

## 水平線

---

## 跳脫與原始 HTML(安全)

反斜線跳脫:\*這不是斜體\*

原始 HTML 一律當文字、不執行:<b>這不會變粗體</b>

---

## 已加的 plugin(見左側 📌 各自的示範文件)

- 標題錨點(anchor)、螢光標記 `==…==`(mark)、數學公式(KaTeX)、連結開新分頁(link-attributes)

## 還沒加的(之後可一個一個加)

- 任務清單 `- [ ]`、註腳 `[^1]`、容器 `::: note`、emoji `:smile:`
