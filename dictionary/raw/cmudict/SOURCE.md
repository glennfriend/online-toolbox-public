# CMU Pronouncing Dictionary

- **是什麼**:卡內基美隆大學的英文發音字典,用 ARPAbet 音素標記,含重音(0/1/2)。北美發音。
- **能解鎖**:音素 → IPA、準確音節數、重音、押韻 / 近韻、同音字。
- **來源**:https://github.com/cmusphinx/cmudict
- **授權**:CMU 授權(BSD-2 類,可自由使用,需保留聲明)。
- **下載日**:2026-06-20

## 檔案
- `cmudict.dict` — 主檔,135,166 條(`word  AH0 ...` 格式)。
- `cmudict.phones` — 音素 → 類別。
- `cmudict.symbols` — 全部音素符號。

## 重新下載
```bash
curl -L -o cmudict.dict    https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
curl -L -o cmudict.phones  https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.phones
curl -L -o cmudict.symbols https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.symbols
```
