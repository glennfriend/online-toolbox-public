# ∑ 數學公式速查(@vscode/markdown-it-katex)

行內公式用 `$…$`、區塊公式用 `$$…$$`。語法是 **LaTeX**,引擎是 **KaTeX**。
下面每列:左邊「怎麼寫」(原始碼)、右邊「顯示結果」。

## 基本

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 上標 | `x^2` | $x^2$ |
| 下標 | `x_i` | $x_i$ |
| 上下標 | `x_i^{2}` | $x_i^{2}$ |
| 分數 | `\frac{a}{b}` | $\frac{a}{b}$ |
| 根號 | `\sqrt{x}` | $\sqrt{x}$ |
| n 次根 | `\sqrt[3]{x}` | $\sqrt[3]{x}$ |
| 絕對值 | `\lvert x \rvert` | $\lvert x \rvert$ |
| 二項式 | `\binom{n}{k}` | $\binom{n}{k}$ |

## 希臘字母

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 小寫 | `\alpha \beta \gamma \delta \theta \lambda \mu \pi \sigma \phi \omega` | $\alpha\ \beta\ \gamma\ \delta\ \theta\ \lambda\ \mu\ \pi\ \sigma\ \phi\ \omega$ |
| 大寫 | `\Gamma \Delta \Theta \Lambda \Sigma \Phi \Omega` | $\Gamma\ \Delta\ \Theta\ \Lambda\ \Sigma\ \Phi\ \Omega$ |

## 運算與關係

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 乘除 | `\times \div \cdot \pm \mp` | $\times\ \div\ \cdot\ \pm\ \mp$ |
| 比較 | `\leq \geq \neq \approx \equiv` | $\leq\ \geq\ \neq\ \approx\ \equiv$ |
| 比例/相似 | `\propto \sim \cong` | $\propto\ \sim\ \cong$ |
| 集合 | `\in \notin \subset \subseteq \cup \cap \emptyset` | $\in\ \notin\ \subset\ \subseteq\ \cup\ \cap\ \emptyset$ |
| 邏輯 | `\forall \exists \neg \land \lor` | $\forall\ \exists\ \neg\ \land\ \lor$ |
| 無窮/點 | `\infty \cdots \ldots` | $\infty\ \cdots\ \ldots$ |

## 大型運算子

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 求和 | `\sum_{i=1}^{n} i` | $\sum_{i=1}^{n} i$ |
| 連乘 | `\prod_{i=1}^{n} i` | $\prod_{i=1}^{n} i$ |
| 積分 | `\int_{0}^{1} x\,dx` | $\int_{0}^{1} x\,dx$ |
| 二重積分 | `\iint_{D} f` | $\iint_{D} f$ |
| 極限 | `\lim_{x \to 0} f(x)` | $\lim_{x \to 0} f(x)$ |

## 箭頭

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 一般 | `\to \rightarrow \leftarrow \leftrightarrow` | $\to\ \rightarrow\ \leftarrow\ \leftrightarrow$ |
| 雙線 | `\Rightarrow \Leftarrow \Leftrightarrow` | $\Rightarrow\ \Leftarrow\ \Leftrightarrow$ |
| 對應 | `\mapsto` | $\mapsto$ |

## 函數與三角

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 三角 | `\sin \cos \tan` | $\sin\ \cos\ \tan$ |
| 對數/指數 | `\log \ln \exp` | $\log\ \ln\ \exp$ |
| 範例 | `\sin^2\theta + \cos^2\theta = 1` | $\sin^2\theta + \cos^2\theta = 1$ |

## 括號(自動縮放)

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 圓括號 | `\left( \frac{a}{b} \right)` | $\left( \frac{a}{b} \right)$ |
| 方括號 | `\left[ \frac{a}{b} \right]` | $\left[ \frac{a}{b} \right]$ |
| 大括號 | `\left\{ x \right\}` | $\left\{ x \right\}$ |
| 角括號 | `\langle x \rangle` | $\langle x \rangle$ |

## 上方標記

| 用途 | 原始碼 | 顯示 |
|---|---|---|
| 向量 | `\vec{v}` | $\vec{v}$ |
| 帽子 | `\hat{x}` | $\hat{x}$ |
| 上劃線 | `\bar{x}` | $\bar{x}$ |
| 波浪 | `\tilde{x}` | $\tilde{x}$ |
| 長上劃線 | `\overline{AB}` | $\overline{AB}$ |

## 矩陣(區塊)

```latex
$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
$$
```

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
$$

> 換 `bmatrix` 是方括號、`vmatrix` 是行列式。

## 多行對齊(區塊)

```latex
$$
\begin{aligned}
f(x) &= (x+1)^2 \\
     &= x^2 + 2x + 1
\end{aligned}
$$
```

$$
\begin{aligned}
f(x) &= (x+1)^2 \\
     &= x^2 + 2x + 1
\end{aligned}
$$

## 分段函數(區塊)

```latex
$$
\lvert x \rvert =
\begin{cases}
  x & x \ge 0 \\
  -x & x < 0
\end{cases}
$$
```

$$
\lvert x \rvert =
\begin{cases}
  x & x \ge 0 \\
  -x & x < 0
\end{cases}
$$

## 經典範例

二次公式:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

高斯積分:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
