# 配件圖庫(items)

配件 = 去背點陣圖(主體不透明、週圍透明)。**不分畫風**,全放 `raw/assets/items/`。

## 依角色/種類分資料夾

`raw/assets/items/<角色>/<變化>.png`:
- **同一個角色(或同一種類)放同一個資料夾**;不同角色/種類各自一個資料夾。
- 同種類再多一種就加 `_2`(例:`dog` → `dog_2`)。
- 變化(姿勢/顏色/角度)是資料夾內的檔名,如 `penguin/sleepy.png`、`dog/run.png`。

**故事引用**:`"item": "<角色>/<變化>"`(如 `penguin/sleepy`);只寫 `"penguin"` 取該角色第一個變化。
執行期索引在 `js/items.js`(`ITEMS[角色].variants[變化]`)。

> **重點:一則故事有幾個人,就用「幾個不同資料夾」的角色去演,別用同一角色扮兩個人**
> (例:兩人對話用 `girl/1` + `old_man/main`,或 `penguin/*` + `dog/*`,不要 `penguin` + `penguin`)。

## 收件匣 → items(用完即空)

原圖丟 `raw/assets/items_before_clean/`(乾淨白底)或 `items_before_noisy/`(附近有雜質)。
**有可轉換的就全部去背轉到 `items/<角色>/<變化>.png`,轉換後刪原檔**。工具與門檻見 `tools/README.md`
(乾淨 `Cut` thr 232、人像加 `,6,$false`;髒圖 `CutNoisy` thr ~212)。

## 現有角色

| 角色 | label | 變化 |
|------|-------|------|
| penguin | 企鵝(3D 黏土) | hello, gugu, gaga, cool, love, dance, sleepy, wow, yummy, grumpy, weee, thankyou |
| dog | 狗(卡通) | run, trot, jump, dash, sit |
| bird | 鳥/海鷗 | 1, 2, 3 |
| cloud | 雲 | line, small, face, yellow |
| potted_plant | 盆栽 | main |
| clock | 時鐘 | main |
| window | 窗戶 | day, night |
| heart | 愛心 | main |
| girl | 女生(卡通丸子頭) | 1, 2 |
| girl_2 | 女生(卡通黑髮瀏海) | main |
| old_man | 老先生(卡通) | main |
| woman_bw | 女生(寫實黑白素描) | 1, 2, 3 |
| man_bw | 男生(寫實黑白素描,年輕) | main |
| chameleon | 變色龍(真實照片) | main |
| cat | 貓群(真實照片) | main |
| child | 小孩拍照(真實照片) | main |

畫風備註:penguin=3D 黏土;dog/bird/cloud/girl/girl_2/old_man/物件=手繪卡通;woman_bw=黑白素描;
chameleon/cat/child=真實照片梗圖(整張直接貼)。**同一格盡量用同畫風的角色**,避免混搭突兀。
各變化的尺寸/tags 見 `js/items.js`。
