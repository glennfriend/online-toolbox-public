"use strict";
/* 圓  x² + y² = r²  —— 拖圓上的點看座標,滑桿調半徑 */
registerGraph({
  id: 'circle',
  name: '圓',
  eq: 'x²+y²=r²',
  group: '形狀 · 生成',
  create: function(root){
    var plot = createPlot({ xMin:-9, xMax:9, yMin:-9, yMax:9 });
    plot.grid(); plot.axes();

    var circle = plot.el('circle', { cx:plot.sx(0), cy:plot.sy(0), fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var projX  = plot.el('line', { stroke:THEME.x, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
    var projY  = plot.el('line', { stroke:THEME.y, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
    plot.el('circle', { cx:plot.sx(0), cy:plot.sy(0), r:3, fill:THEME.muted });
    var pt = plot.el('circle', { r:6.5, fill:THEME.accent });

    var r = 4, theta = Math.PI/4;
    var out = UI.readout();
    function draw(){
      var U = plot.W / 18;                          // 每單位像素
      circle.setAttribute('r', r * U);
      var x = r*Math.cos(theta), y = r*Math.sin(theta);
      var px = plot.sx(x), py = plot.sy(y);
      pt.setAttribute('cx', px); pt.setAttribute('cy', py);
      projX.setAttribute('x1',px); projX.setAttribute('y1',plot.sy(0)); projX.setAttribute('x2',px); projX.setAttribute('y2',py);
      projY.setAttribute('x1',px); projY.setAttribute('y1',py);        projY.setAttribute('x2',plot.sx(0)); projY.setAttribute('y2',py);
      out.innerHTML = '(x, y) = (' + x.toFixed(1) + ', ' + y.toFixed(1) + ')　｜　x² + y² = ' + (x*x+y*y).toFixed(1) + ' = r²';
    }

    var wrap = UI.plotWrap(plot.svg, true);
    var dragging = false;
    function onMove(e){ var m = plot.clientToMath(e); theta = Math.atan2(m.y, m.x); draw(); }
    plot.svg.addEventListener('pointerdown', function(e){ dragging=true; onMove(e); try{ plot.svg.setPointerCapture(e.pointerId);}catch(_){} });
    plot.svg.addEventListener('pointermove', function(e){ if(dragging) onMove(e); });
    plot.svg.addEventListener('pointerup',   function(){ dragging=false; });

    var controls = UI.controls();
    var rSlider = UI.sliderRow('r (半徑)', { min:1, max:8, step:1, value:r }, function(v, o){ r=v; o.textContent=v; draw(); });
    controls.appendChild(rSlider.row);

    var note = UI.note(
      '<span class="x">x</span>、<span class="y">y</span> 是圓上某個點的座標,拖動橘點繞圓走就會改變它們。' +
      '<span class="k">r</span> 是半徑,用滑桿調,決定整個圓的大小。不管點拖到哪,x²+y² 永遠等於 r²。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('x² + y² = <span class="p">r</span>²'), out, wrap, controls, note);
    root.appendChild(panel);

    rSlider.out.textContent = r;
    draw();
    return {};
  }
});
