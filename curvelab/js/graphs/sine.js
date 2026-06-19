"use strict";
/* 正弦・餘弦  y = sin(x) / cos(x)  —— 單位圓上同一個轉動點的兩個投影 */
registerGraph({
  id: 'sine',
  name: '正弦・餘弦',
  eq: 'sin / cos',
  group: '函數 · 線',
  create: function(root){
    // 寬而扁,且兩軸等比例(圓才會圓):x 範圍 10.2、y 範圍 3.6 → 高 ≈ 寬 × 3.6/10.2
    var plot = createPlot({ xMin:-3.2, xMax:7, yMin:-1.8, yMax:1.8, width:380, height:134 });
    plot.grid(); plot.axes();

    var cx0 = -1.6;                                  // 單位圓圓心 x
    var out = UI.readout();

    var tracer = UI.tracer(plot, {
      fx: function(t){ return t; },                  // 主曲線:sin 波 (x, sin x)
      fy: function(t){ return Math.sin(t); },
      tMin: 0, tMax: 2*Math.PI, frames: 240,
      tLabel: 'x',
      color: THEME.y,                                // sin 用橘色(對應它的股)
      decorate: function(p){
        var rpx = Math.abs(p.sx(cx0+1) - p.sx(cx0));            // 單位半徑的像素長
        p.el('circle', { cx:p.sx(cx0), cy:p.sy(0), r:rpx, fill:'none', stroke:THEME.line, 'stroke-width':1.5 });
        // cos 的底圖(淡)與軌跡(藍)
        p.el('path', { d:p.paramPath(function(t){ return t; }, function(t){ return Math.cos(t); }, 0, 2*Math.PI, 0.01),
                       fill:'none', stroke:THEME.line, 'stroke-width':2, 'stroke-dasharray':'2 4' });
        var cosTrail = p.el('path', { fill:'none', stroke:THEME.x, 'stroke-width':3, 'stroke-linejoin':'round', 'stroke-linecap':'round' });
        var cosPt    = p.el('circle', { r:5, fill:THEME.x });
        // 圓上的直角三角形:水平股 = cos(藍)、垂直股 = sin(橘)、斜邊 = 半徑(1)
        var radius = p.el('line', { stroke:THEME.muted, 'stroke-width':1.5 });
        var legH   = p.el('line', { stroke:THEME.x, 'stroke-width':3 });            // cos:水平
        var legV   = p.el('line', { stroke:THEME.y, 'stroke-width':3 });            // sin:垂直
        var Pc     = p.el('circle', { r:4.5, fill:THEME.accent });
        var conn   = p.el('line', { stroke:THEME.y, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });  // 把 sin 高度連到 sin 波
        return function(t){
          var c = Math.cos(t), s = Math.sin(t);
          var fx = cx0 + c;                              // P 的 x(腳點)
          radius.setAttribute('x1', p.sx(cx0)); radius.setAttribute('y1', p.sy(0)); radius.setAttribute('x2', p.sx(fx)); radius.setAttribute('y2', p.sy(s));
          legH.setAttribute('x1', p.sx(cx0)); legH.setAttribute('y1', p.sy(0)); legH.setAttribute('x2', p.sx(fx)); legH.setAttribute('y2', p.sy(0));
          legV.setAttribute('x1', p.sx(fx));  legV.setAttribute('y1', p.sy(0)); legV.setAttribute('x2', p.sx(fx)); legV.setAttribute('y2', p.sy(s));
          Pc.setAttribute('cx', p.sx(fx)); Pc.setAttribute('cy', p.sy(s));
          conn.setAttribute('x1', p.sx(fx)); conn.setAttribute('y1', p.sy(s)); conn.setAttribute('x2', p.sx(t)); conn.setAttribute('y2', p.sy(s));
          cosTrail.setAttribute('d', p.paramPath(function(u){ return u; }, function(u){ return Math.cos(u); }, 0, t, 0.01));
          cosPt.setAttribute('cx', p.sx(t)); cosPt.setAttribute('cy', p.sy(c));
        };
      },
      onDraw: function(t){
        // 用顯示的 x 算 sin、cos;兩者通常是無理數,顯示為四捨五入的近似值,故用 ≈
        var xr = Num.round(t, 2);
        out.innerHTML = '<span class="x">x = ' + Num.show(xr,2) + '</span>　｜　' +
          '<span class="y">sin(x) ≈ ' + Num.show(Math.sin(xr),2) + '</span>　｜　' +
          '<span style="color:var(--x);font-weight:600">cos(x) ≈ ' + Num.show(Math.cos(xr),2) + '</span>';
      }
    });

    var note = UI.note(
      '單位圓上一個轉動點,有兩個影子:<span class="y">高度(上下)= sin</span>、<span class="x">左右位置 = cos</span>。' +
      '它們正是這個點在直角三角形裡的兩股,斜邊是半徑 = 1,所以永遠 <span class="k">sin²+cos² = 1</span>。' +
      '右邊兩條波就是 sin(橘)和 cos(藍):形狀一樣,<span class="x">cos 只是領先 sin 90°</span> 的同一種波。' +
      '<br><span style="color:var(--muted);font-size:13px">註:sin、cos 的值通常是無理數,畫面顯示為四捨五入後的近似值(≈)。</span>'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span style="color:var(--y)">sin(x)</span>　/　<span style="color:var(--x)">cos(x)</span>'),
                 out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
