"use strict";
/* 阿基米德螺線  r = b·θ  —— 一邊轉、一邊等速往外 */
registerGraph({
  id: 'spiral',
  name: '螺線',
  eq: 'r=bθ',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });   // 方形 → 不變形
    plot.grid(); plot.axes();

    var b = 0.32;
    var out = UI.readout();
    var tracer = UI.tracer(plot, {
      fx: function(t){ return b*t*Math.cos(t); },
      fy: function(t){ return b*t*Math.sin(t); },
      tMin: 0, tMax: 5*Math.PI, frames: 300, step: 0.02,
      decorate: function(p){
        var spoke = p.el('line', { stroke:THEME.x, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
        return function(t){
          spoke.setAttribute('x1', p.sx(0)); spoke.setAttribute('y1', p.sy(0));
          spoke.setAttribute('x2', p.sx(b*t*Math.cos(t))); spoke.setAttribute('y2', p.sy(b*t*Math.sin(t)));
        };
      },
      onDraw: function(t){ out.innerHTML = '轉了 ' + (t/(2*Math.PI)).toFixed(2) + ' 圈　｜　離中心距離 r = ' + (b*t).toFixed(2); }
    });

    var note = UI.note(
      '一個點一邊<span class="x">以固定速度繞中心轉</span>,一邊<span class="y">以固定速度往外跑</span>,' +
      '走出來的就是阿基米德螺線。因為往外的速度固定,所以每一圈之間的間隔都一樣寬(像蚊香、發條)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('r = <span class="p">b</span>·θ　<span style="font-size:13px;color:var(--muted)">(極座標:角度越大,半徑越大)</span>'), out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
