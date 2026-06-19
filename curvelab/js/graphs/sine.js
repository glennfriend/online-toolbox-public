"use strict";
/* 正弦曲線  y = sin(x)  —— 從單位圓「旋轉 → 波」生成 */
registerGraph({
  id: 'sine',
  name: '正弦曲線',
  eq: 'y=sin(x)',
  group: '函數 · 線',
  create: function(root){
    // 寬而扁,且兩軸等比例(圓才會圓):x 範圍 10.2、y 範圍 3.6 → 高 ≈ 寬 × 3.6/10.2
    var plot = createPlot({ xMin:-3.2, xMax:7, yMin:-1.8, yMax:1.8, width:380, height:134 });
    plot.grid(); plot.axes();

    var cx0 = -1.6;                                  // 單位圓圓心 x
    var out = UI.readout();

    var tracer = UI.tracer(plot, {
      fx: function(t){ return t; },                  // 波:x = t
      fy: function(t){ return Math.sin(t); },        //      y = sin t
      tMin: 0, tMax: 2*Math.PI, frames: 240,
      tLabel: 'x',                                   // 這張圖的參數就是橫軸的 x
      fmt: function(t){ return t.toFixed(2); },
      decorate: function(p){
        p.el('circle', { cx:p.sx(cx0), cy:p.sy(0), r:Math.abs(p.sx(cx0+1)-p.sx(cx0)), fill:'none', stroke:THEME.line, 'stroke-width':1.5 });
        var radius = p.el('line', { stroke:THEME.x, 'stroke-width':1.5 });
        var conn   = p.el('line', { stroke:THEME.y, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
        var dot    = p.el('circle', { r:4, fill:THEME.x });
        return function(t){
          var hx = cx0 + Math.cos(t), hy = Math.sin(t);
          radius.setAttribute('x1', p.sx(cx0)); radius.setAttribute('y1', p.sy(0));
          radius.setAttribute('x2', p.sx(hx));  radius.setAttribute('y2', p.sy(hy));
          dot.setAttribute('cx', p.sx(hx)); dot.setAttribute('cy', p.sy(hy));
          conn.setAttribute('x1', p.sx(hx)); conn.setAttribute('y1', p.sy(hy));
          conn.setAttribute('x2', p.sx(t));  conn.setAttribute('y2', p.sy(hy));
        };
      },
      onDraw: function(t, X, Y){
        // 用顯示的 x 算 y;sin 的值是無理數,顯示為四捨五入的近似值,故用 ≈
        var xr = Num.round(t, 2), yr = Math.sin(xr);
        out.innerHTML = '<span class="x">x = ' + Num.show(xr,2) + '</span>　→　<span class="y">y = sin(x) ≈ ' + Num.show(yr,2) + '</span>';
      }
    });

    var note = UI.note(
      '把一個點繞<span class="x">單位圓</span>轉,它的<span class="y">高度</span>就是 sin。' +
      '當 <span class="x">x</span>(也就是繞圓轉的角度)一邊增加,高度一邊上上下下,把每個 x 的高度往右排開,畫出來就是正弦波。' +
      '這就是「旋轉 → 波」:三角函數和圓其實是同一件事。按播放看它生成。' +
      '<br><span style="color:var(--muted);font-size:13px">註:sin 的值通常是無理數,畫面顯示為四捨五入後的近似值(≈)。</span>'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = sin(x)'), out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
