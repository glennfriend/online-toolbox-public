"use strict";
/* 共用 library:數字的「教學品質」顯示規範。
 *
 * 給學生看的數字不能「兜不起來」。本檔把規則工具化,正統、可重複套用:
 *
 *  1. 畫面上每個數字,不是「精確值」就是明確標示的「近似值」。
 *  2. 精確值 = 學生設定的參數,或由整數/有理數精確算出的結果 → 完整顯示,不因四捨五入而失真。
 *  3. 近似值 = 無理數或被四捨五入的值 → 用 Num.show 統一格式,式子裡用 ≈,
 *     並在該圖的說明裡告訴學生「為什麼是近似」。
 *  4. WYSIWYG:任何顯示的等式,其「結果」一律由「畫面上顯示的那些數字」計算得到,
 *     不可用內部高精度值算出一個跟畫面數字兜不起來的結果。
 *     做法:先用 Num.round() 把要顯示的「輸入」定下來,再用這些已定下的值去算要顯示的「結果」。 */
var Num = {
  // 四捨五入到 dp 位小數(預設 2),回傳數字
  round: function(x, dp){ dp = (dp==null ? 2 : dp); var f = Math.pow(10, dp); return Math.round(x*f)/f; },

  // 是否(在容差內)為整數
  isInt: function(x, eps){ return Math.abs(x - Math.round(x)) <= (eps==null ? 1e-9 : eps); },

  // 顯示字串:接近整數就顯示整數(不帶小數點);否則四捨五入到 dp 位並自動去掉尾端多餘的 0
  //   3 → "3"、1.5 → "1.5"、16.0178 → "16.02"、-0.25 → "-0.25"
  show: function(x, dp){
    dp = (dp==null ? 2 : dp);
    var r = Num.round(x, dp);
    if (r === 0) return '0';                 // 避免 "-0"
    if (Num.isInt(r, 1e-9)) return String(Math.round(r));
    return String(r);                        // r 已四捨五入,String() 會給乾淨字串
  },

  // 在 dp 位精度下,a 與 b 是否相等 → 決定等式該用 '=' 還是 '≈'
  sameAt: function(a, b, dp){ dp = (dp==null ? 2 : dp); return Num.round(a, dp) === Num.round(b, dp); },

  // 回傳 '=' 或 '≈':比較「顯示值算出的結果 shown」與「精確值 exact」
  rel: function(shown, exact, dp){ return Num.sameAt(shown, exact, dp) ? '=' : '≈'; },
};
