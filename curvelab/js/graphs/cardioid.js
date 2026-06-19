"use strict";
/* 心臟線  r = a(1 − cos θ)  —— 極座標生成的愛心 */
registerGraph({
  id: 'cardioid',
  name: '心臟線',
  eq: 'r=a(1−cosθ)',
  create: function(root){
    var a = 2;
    // 心臟線往左延伸,取範圍 x:[-5,1.5]、y:[-3.25,3.25],兩邊都 6.5 → 不變形
    var plot = createPlot({ xMin:-5, xMax:1.5, yMin:-3.25, yMax:3.25 });
    plot.grid(); plot.axes();

    var out = UI.readout();
    var tracer = UI.tracer(plot, {
      fx: function(t){ return a*(1-Math.cos(t)) * Math.cos(t); },
      fy: function(t){ return a*(1-Math.cos(t)) * Math.sin(t); },
      tMin: 0, tMax: 2*Math.PI, frames: 220, step: 0.01,
      decorate: function(p){
        var spoke = p.el('line', { stroke:THEME.x, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
        return function(t){
          var r = a*(1-Math.cos(t));
          spoke.setAttribute('x1', p.sx(0)); spoke.setAttribute('y1', p.sy(0));
          spoke.setAttribute('x2', p.sx(r*Math.cos(t))); spoke.setAttribute('y2', p.sy(r*Math.sin(t)));
        };
      },
      onDraw: function(t){ out.innerHTML = '角度 θ = ' + (t*180/Math.PI).toFixed(0) + '°　｜　半徑 r = ' + (a*(1-Math.cos(t))).toFixed(2); }
    });

    var note = UI.note(
      '用極座標想:給一個<span class="x">角度 θ</span>,半徑按 <span class="k">r = a(1 − cos θ)</span> 伸縮——' +
      '正對時 (θ=0) 半徑 0,轉到背面 (θ=180°) 半徑最長。把每個角度的點連起來,就描出一顆愛心。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('r = <span class="p">a</span>(1 − cos θ)'), out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
