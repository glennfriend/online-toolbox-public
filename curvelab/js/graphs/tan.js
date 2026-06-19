"use strict";
/* 正切  y = tan(x) = sin(x)/cos(x)  —— 有漸近線(cos=0 處衝向無限大) */
registerGraph({
  id: 'tan',
  name: '正切',
  eq: 'y=tan(x)',
  group: '函數 · 線',
  create: function(root){
    var X = 4.8, Y = 4;
    var plot = createPlot({ xMin:-X, xMax:X, yMin:-Y, yMax:Y });
    plot.grid(); plot.axes();

    // 漸近線:cos(x)=0 的地方,x = ±π/2, ±3π/2 …
    [-3*Math.PI/2, -Math.PI/2, Math.PI/2, 3*Math.PI/2].forEach(function(xa){
      if (xa > -X && xa < X)
        plot.el('line', { x1:plot.sx(xa), y1:0, x2:plot.sx(xa), y2:plot.H, stroke:THEME.danger, 'stroke-width':1.5, 'stroke-dasharray':'5 4', opacity:0.7 });
    });

    // tan 曲線:分段畫,|y| 超過範圍就抬筆(讓每一支乾淨地停在邊界)
    var d = '', pen = false;
    for (var x = -X; x <= X + 1e-9; x += 0.01){
      var y = Math.tan(x);
      if (!isFinite(y) || Math.abs(y) > Y){ pen = false; continue; }
      d += (pen ? 'L' : 'M') + plot.sx(x).toFixed(1) + ' ' + plot.sy(y).toFixed(1) + ' '; pen = true;
    }
    plot.el('path', { d:d, fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });

    var pt = plot.el('circle', { r:6, fill:THEME.accent });
    var out = UI.readout();

    var xv = 0.6;
    function draw(){
      var c = Math.cos(xv), s = Math.sin(xv), tn = Math.tan(xv);
      var nearAsym = Math.abs(c) < 0.08;
      if (!nearAsym && Math.abs(tn) <= Y){
        pt.setAttribute('opacity', 1); pt.setAttribute('cx', plot.sx(xv)); pt.setAttribute('cy', plot.sy(tn));
      } else { pt.setAttribute('opacity', 0); }
      var xr = Num.round(xv, 2);
      if (nearAsym){
        out.innerHTML = '<span class="x">x = ' + Num.show(xr,2) + '</span>　｜　cos(x) ≈ 0　→　' +
          '<span class="err">tan = sin/cos 分母趨近 0,衝向 ±∞(漸近線)</span>';
      } else {
        out.innerHTML = '<span class="x">x = ' + Num.show(xr,2) + '</span>　｜　tan(x) = sin/cos ≈ ' +
          Num.show(Math.tan(xr),2) + '　(= ' + Num.show(Math.sin(xr),2) + ' / ' + Num.show(Math.cos(xr),2) + ')';
      }
    }

    var controls = UI.controls();
    var xs = UI.sliderRow('x (探針)', { min:-X, max:X, step:0.05, value:xv }, function(v){ xv=v; xs.out.textContent = Num.show(v,2); draw(); });
    controls.appendChild(xs.row);

    var note = UI.note(
      '<span class="k">tan(x) = sin(x) / cos(x)</span>。拉動探針看它的值。' +
      '當 <span class="x">cos(x) = 0</span>(x = ±90°、±270°…)時,分母是 0、不能除 → tan 沒有定義,' +
      '曲線在那裡<span class="err">衝向 ±∞</span>,形成<span class="err">紅色虛線的漸近線</span>。' +
      'tan 的週期是 π(比 sin、cos 的 2π 短一半)。' +
      '<br><span style="color:var(--muted);font-size:13px">註:tan 的值通常是無理數,顯示為四捨五入後的近似值(≈)。</span>'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = tan(x) = <span style="color:var(--y)">sin(x)</span> / <span style="color:var(--x)">cos(x)</span>'),
                 out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    xs.out.textContent = Num.show(xv,2); draw();
    return {};
  }
});
