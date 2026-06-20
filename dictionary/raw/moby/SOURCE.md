# Moby Project (+ Roget's Thesaurus 1913)

- **是什麼**:Grady Ward 的 Moby Project,英文最大型的公共領域詞彙資料之一;此鏡像另含 Roget 1913 同義詞庫。
- **能解鎖**:同義/相關詞庫、Roget 分類、詞性標記、發音。
- **來源**:https://github.com/elitejake/Moby-Project(Grady Ward 原作的鏡像)
- **授權**:**公共領域**(Grady Ward 明確釋出;Roget 1913 亦為公共領域)。
- **下載日**:2026-06-20

## 檔案
- `mthesaur.txt` — Moby Thesaurus,30,259 主條目(每行:主詞,相關詞,…),24M。
- `roget13a.txt` — Roget's Thesaurus(1913),1.5M。
- `mobypos.txt` — 詞性標記,233,356 詞,2.9M。
- `mpron.txt` — 發音,177,266 詞,5.3M。

## 重新下載
```bash
B="https://raw.githubusercontent.com/elitejake/Moby-Project/main"
curl -L -o mthesaur.txt "$B/Moby%20Thesaurus%20II/mthesaur.txt"
curl -L -o roget13a.txt "$B/Moby%20Thesaurus%20II/roget13a.txt"
curl -L -o mobypos.txt  "$B/Moby%20Part-of-Speech%20II/mobypos.txt"
curl -L -o mpron.txt    "$B/Moby%20Pronunciator%20II/mpron.txt"
```
