"use strict";
/* 直線  y = m x + b  —— 斜率與截距(國中:一次函數) */
registerGraph({
  id: 'line',
  name: '直線',
  eq: 'y=mx+b',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });
    plot.grid(); plot.axes();

    var m = 1, b = 1;
    var line = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var run  = plot.el('line', { stroke:THEME.x, 'stroke-width':2, 'stroke-dasharray':'4 3' });
    var rise = plot.el('line', { stroke:THEME.y, 'stroke-width':2, 'stroke-dasharray':'4 3' });
    var yint = plot.el('circle', { r:5, fill:THEME.y });
    var out  = UI.readout();

    function draw(){
      var f = function(x){ return m*x + b; };
      line.setAttribute('d', plot.funcPath(f, -6, 6, 0.2));
      run.setAttribute('x1', plot.sx(0)); run.setAttribute('y1', plot.sy(b)); run.setAttribute('x2', plot.sx(1)); run.setAttribute('y2', plot.sy(b));
      rise.setAttribute('x1', plot.sx(1)); rise.setAttribute('y1', plot.sy(b)); rise.setAttribute('x2', plot.sx(1)); rise.setAttribute('y2', plot.sy(b+m));
      yint.setAttribute('cx', plot.sx(0)); yint.setAttribute('cy', plot.sy(b));
      out.innerHTML = 'y = ' + m + ' x + ' + b + '　｜　右移 <span class="x">1</span>,上升 <span class="y">' + m + '</span>　｜　y 截距 = ' + b;
    }

    var controls = UI.controls();
    var ms = UI.sliderRow('m (斜率)', { min:-3, max:3, step:0.5, value:m }, function(v,o){ m=v; o.textContent=v; draw(); });
    var bs = UI.sliderRow('b (截距)', { min:-5, max:5, step:1,   value:b }, function(v,o){ b=v; o.textContent=v; draw(); });
    controls.append(ms.row, bs.row);

    var note = UI.note(
      '<span class="k">m</span> 是斜率,決定線的斜度——每往<span class="x">右走 1</span>,線就<span class="y">上升 m</span>(虛線三角形)。' +
      '<span class="k">b</span> 是 y 截距,也就是線跟 <span class="y">y 軸</span>交在 (0, b)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span class="p">m</span>x + <span class="p">b</span>'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    ms.out.textContent = m; bs.out.textContent = b; draw();
    return {};
  }
});
