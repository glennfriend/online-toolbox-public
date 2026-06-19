"use strict";
/* 共用 library:主題色。從 CSS 變數讀出目前(淺/深色)實際色碼,給 SVG 用。 */
function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
var THEME = {
  ink:    cssVar('--ink'),
  muted:  cssVar('--muted'),
  line:   cssVar('--line'),
  accent: cssVar('--accent'),
  x:      cssVar('--x'),
  y:      cssVar('--y'),
};
