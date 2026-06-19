"use strict";
/* 擺線  —— 滾動的輪子,輪緣上一點畫出的軌跡 */
registerGraph({
  id: 'cycloid',
  name: '擺線',
  eq: '滾動的輪',
  group: '形狀 · 生成',
  create: function(root){
    // 兩軸等比例:x 範圍 7.5、y 範圍 3.0 → 高 = 寬 × 3/7.5
    var plot = createPlot({ xMin:-0.6, xMax:6.9, yMin:-0.4, yMax:2.6, width:380, height:152 });
    plot.grid();
    plot.el('line', { x1:0, y1:plot.sy(0), x2:plot.W, y2:plot.sy(0), stroke:THEME.muted, 'stroke-width':1.5 });  // 地面

    var out = UI.readout();
    var tracer = UI.tracer(plot, {
      fx: function(t){ return t - Math.sin(t); },
      fy: function(t){ return 1 - Math.cos(t); },
      tMin: 0, tMax: 2*Math.PI, frames: 220,
      decorate: function(p){
        var wheel  = p.el('circle', { fill:'none', stroke:THEME.line, 'stroke-width':1.5 });
        var spoke  = p.el('line', { stroke:THEME.x, 'stroke-width':1.5 });
        var hub    = p.el('circle', { r:3, fill:THEME.muted });
        var rpx = Math.abs(p.sx(1) - p.sx(0));   // 半徑像素
        return function(t){
          var ctr = t;                            // 圓心 x(圓心高度固定 = 1)
          wheel.setAttribute('cx', p.sx(ctr)); wheel.setAttribute('cy', p.sy(1)); wheel.setAttribute('r', rpx);
          hub.setAttribute('cx', p.sx(ctr)); hub.setAttribute('cy', p.sy(1));
          spoke.setAttribute('x1', p.sx(ctr)); spoke.setAttribute('y1', p.sy(1));
          spoke.setAttribute('x2', p.sx(t-Math.sin(t))); spoke.setAttribute('y2', p.sy(1-Math.cos(t)));
        };
      },
      onDraw: function(t){ out.innerHTML = '輪子滾過的角度 t = ' + (t*180/Math.PI).toFixed(0) + '°'; }
    });

    var note = UI.note(
      '一個輪子沿著地面滾,盯著輪子<span class="x">邊緣上的一點</span>(像輪胎上的小石頭)。' +
      '輪子滾一圈,這個點就畫出一個拱形——這條軌跡叫擺線。' +
      '它既不是圓也不是拋物線,而是「滾動」自然產生的曲線。按播放看輪子滾。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('滾動輪緣上一點的軌跡'), out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
