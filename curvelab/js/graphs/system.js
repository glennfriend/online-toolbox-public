"use strict";
/* 聯立方程式(兩直線交點)—— 兩個一次方程式的解 = 兩線交點 */
registerGraph({
  id: 'system',
  name: '聯立方程式',
  eq: '兩線交點',
  group: '函數 · 線',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });
    plot.grid(); plot.axes();

    var m1 = 1, b1 = 1, m2 = -1, b2 = -1;
    var L1 = plot.el('path', { fill:'none', stroke:THEME.x, 'stroke-width':2.5 });
    var L2 = plot.el('path', { fill:'none', stroke:THEME.y, 'stroke-width':2.5 });
    var dot = plot.el('circle', { r:6.5, fill:THEME.accent });
    var out = UI.readout();

    function draw(){
      L1.setAttribute('d', plot.funcPath(function(x){ return m1*x + b1; }, -6, 6, 0.2));
      L2.setAttribute('d', plot.funcPath(function(x){ return m2*x + b2; }, -6, 6, 0.2));
      if (m1 === m2){
        dot.setAttribute('opacity', 0);
        out.innerHTML = (b1 === b2)
          ? '<span class="err">兩條線重合 → 無限多組解</span>'
          : '<span class="err">兩條線平行,永遠不相交 → 無解</span>';
      } else {
        var x = (b2 - b1) / (m1 - m2), y = m1*x + b1;
        dot.setAttribute('opacity', 1);
        dot.setAttribute('cx', plot.sx(x)); dot.setAttribute('cy', plot.sy(y));
        // 用顯示的交點 x 算 y(可驗算);x 是否被四捨五入決定用 = 還是 ≈
        var xr = Num.round(x, 2), yr = m1*xr + b1;
        var eq = Num.sameAt(x, xr, 9) ? '=' : '≈';
        out.innerHTML = '交點(就是解):(x, y) ' + eq + ' (' + Num.show(xr,2) + ', ' + Num.show(yr,2) + ')';
      }
    }

    var controls = UI.controls();
    var s1 = UI.sliderRow('m₁ 斜率(藍線)', { min:-3, max:3, step:0.5, value:m1 }, function(v,o){ m1=v; o.textContent=v; draw(); });
    var s2 = UI.sliderRow('b₁ 截距(藍線)', { min:-5, max:5, step:1,   value:b1 }, function(v,o){ b1=v; o.textContent=v; draw(); });
    var s3 = UI.sliderRow('m₂ 斜率(橘線)', { min:-3, max:3, step:0.5, value:m2 }, function(v,o){ m2=v; o.textContent=v; draw(); });
    var s4 = UI.sliderRow('b₂ 截距(橘線)', { min:-5, max:5, step:1,   value:b2 }, function(v,o){ b2=v; o.textContent=v; draw(); });
    controls.append(s1.row, s2.row, s3.row, s4.row);

    var note = UI.note(
      '兩個一次方程式各自是<span class="x">一條線</span>、<span class="y">一條線</span>。' +
      '解聯立方程式,就是找<span class="k">同時滿足兩條線的點</span>——也就是兩線的交點。' +
      '把兩線調成平行(斜率相同)就沒有交點,代表這組聯立方程式無解。' +
      '<br><span style="color:var(--muted);font-size:13px">註:交點座標若不是整數或簡單分數,會顯示為四捨五入的近似值(≈)。</span>'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('<span style="color:var(--x)">y=m₁x+b₁</span>　<span style="color:var(--y)">y=m₂x+b₂</span>'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    s1.out.textContent = m1; s2.out.textContent = b1; s3.out.textContent = m2; s4.out.textContent = b2; draw();
    return {};
  }
});
