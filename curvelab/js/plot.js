"use strict";
/* 共用 library:createPlot()。每個圖都用它建立座標系與基本元件。
 * 傳入可視範圍(與可選的 width/height),回傳一組方法:
 * 座標換算、加元件、畫格線/軸、把函數或參數式取樣成路徑、滑鼠座標換算。
 *
 * 提示:要讓圓/橢圓等「形狀」不變形,讓 width/height 的比例 = x/y 範圍的比例
 *      (即每單位的像素在兩軸相等)。 */
var SVGNS = 'http://www.w3.org/2000/svg';

function createPlot(opts){
  var W = opts.width  || 360;
  var H = opts.height || 360;
  var xMin = opts.xMin, xMax = opts.xMax, yMin = opts.yMin, yMax = opts.yMax;

  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');

  function sx(x){ return (x - xMin) / (xMax - xMin) * W; }          // 數學 x → 像素
  function sy(y){ return H - (y - yMin) / (yMax - yMin) * H; }      // 數學 y → 像素

  function el(tag, attrs){
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  }
  function clear(){ while (svg.firstChild) svg.removeChild(svg.firstChild); }

  function grid(){
    for (var x = Math.ceil(xMin); x <= xMax; x++)
      el('line', { x1:sx(x), y1:0, x2:sx(x), y2:H, stroke:THEME.line, 'stroke-width':1 });
    for (var y = Math.ceil(yMin); y <= yMax; y++)
      el('line', { x1:0, y1:sy(y), x2:W, y2:sy(y), stroke:THEME.line, 'stroke-width':1 });
  }
  function axes(){
    el('line', { x1:0, y1:sy(0), x2:W, y2:sy(0), stroke:THEME.muted, 'stroke-width':1.5 });
    el('line', { x1:sx(0), y1:0, x2:sx(0), y2:H, stroke:THEME.muted, 'stroke-width':1.5 });
  }
  // 把函數 y=f(x) 取樣成 SVG path 的 d 字串;超出範圍處斷開(抬筆)避免亂線
  function funcPath(f, x0, x1, step){
    step = step || (xMax - xMin) / 360;
    var d = '', pen = false;
    for (var x = x0; x <= x1 + 1e-9; x += step){
      var y; try { y = f(x); } catch(_) { y = NaN; }
      if (!isFinite(y) || y > yMax + (yMax-yMin) || y < yMin - (yMax-yMin)) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(y).toFixed(1) + ' ';
      pen = true;
    }
    return d;
  }
  // 把參數式 (x(t), y(t)) 取樣成 SVG path;遇到非有限值抬筆(供分段曲線使用)
  function paramPath(fx, fy, t0, t1, step){
    var d = '', pen = false;
    for (var t = t0; t <= t1 + 1e-9; t += step){
      var X, Y; try { X = fx(t); Y = fy(t); } catch(_) { X = NaN; Y = NaN; }
      if (!isFinite(X) || !isFinite(Y)) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + sx(X).toFixed(1) + ' ' + sy(Y).toFixed(1) + ' ';
      pen = true;
    }
    return d;
  }
  // 滑鼠/觸控座標 → 數學座標(供拖曳使用)
  function clientToMath(evt){
    var r = svg.getBoundingClientRect();
    var px = (evt.clientX - r.left) / r.width  * W;
    var py = (evt.clientY - r.top ) / r.height * H;
    return { x: xMin + px / W * (xMax - xMin), y: yMax - py / H * (yMax - yMin) };
  }

  return { svg:svg, W:W, H:H, xMin:xMin, xMax:xMax, yMin:yMin, yMax:yMax,
           sx:sx, sy:sy, el:el, clear:clear, grid:grid, axes:axes,
           funcPath:funcPath, paramPath:paramPath, clientToMath:clientToMath };
}
