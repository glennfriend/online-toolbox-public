"use strict";
/* 利薩茹圖形  x = A·cos(p·t), y = B·sin(q·t)  —— 兩個方向擺動的合成 */
registerGraph({
  id: 'lissajous',
  name: '利薩茹',
  eq: '頻率比 p:q',
  create: function(root){
    var plot = createPlot({ xMin:-3.6, xMax:3.6, yMin:-3.6, yMax:3.6 });  // 方形 → 不變形
    plot.grid(); plot.axes();

    var A = 3, B = 3, p = 3, q = 2;
    var curve = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });
    var out = UI.readout();

    function draw(){
      curve.setAttribute('d', plot.paramPath(
        function(t){ return A*Math.cos(p*t); },
        function(t){ return B*Math.sin(q*t); },
        0, 2*Math.PI + 0.02, 0.01));
      out.innerHTML = '頻率比 p : q = ' + p + ' : ' + q;
    }

    var controls = UI.controls();
    var ps = UI.sliderRow('p (左右)', { min:1, max:5, step:1, value:p }, function(v,o){ p=v; o.textContent=v; draw(); });
    var qs = UI.sliderRow('q (上下)', { min:1, max:5, step:1, value:q }, function(v,o){ q=v; o.textContent=v; draw(); });
    controls.append(ps.row, qs.row);

    var note = UI.note(
      '想像一個點同時做兩種來回擺動:<span class="x">左右</span>擺 p 次的同時,<span class="y">上下</span>擺 q 次。' +
      '兩個擺動合在一起,就畫出這些花樣。<span class="k">頻率比 p:q</span> 不同,圖形就不同(這也是早期示波器上看到的圖案)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('x = A·cos(<span class="p">p</span>t),　y = B·sin(<span class="p">q</span>t)'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    ps.out.textContent = p; qs.out.textContent = q; draw();
    return {};
  }
});
