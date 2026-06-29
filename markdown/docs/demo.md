# 📘 Markdown 功能示範

> 這份只示範 **markdown-it 本身**(不加 plugin)就有的語法(含內建的表格、刪除線)。
> plugin 的功能(螢光標記、數學、任務清單、表格工具…)請看左側各自的示範文件。

## 文字樣式

**粗體**、*斜體*、~~刪除線~~、`行內程式碼`、[超連結](https://markdown-it.github.io/)

裸網址自動連結:https://github.com/markdown-it/markdown-it

## 標題

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

## 表格(markdown-it 內建)

| 語言 | 用途 | 內建 |
|---|---|:---:|
| JavaScript | 前端 | ✅ |
| PHP | 後端 | ✅ |
| JSON | 資料 | ✅ |

## 程式碼

```js
const greet = (name) => `Hi, ${name}`;
console.log(greet("world"));
```

```json
{ "name": "demo", "ok": true, "n": 42 }
```

## 圖片

![badge](https://img.shields.io/badge/markdown--it-CommonMark-blue)

## 水平線

---

## 跳脫與原始 HTML(安全)

反斜線跳脫:\*這不是斜體\*

原始 HTML 一律當文字、不執行:<b>這不會變粗體</b>
