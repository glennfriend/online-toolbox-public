"use strict";
/* 二次函數  y = a x² + b x + c  —— 開口、頂點、y 截距 */
registerGraph({
  id: 'quadratic',
  name: '二次函數',
  eq: 'y=ax²+bx+c',
  group: '函數 · 線',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-4, yMax:12 });
    plot.grid(); plot.axes();

    var a = 1, b = 0, c = -2;
    var curve = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });
    var vtx   = plot.el('circle', { r:5, fill:THEME.y });
    var out   = UI.readout();

    function draw(){
      var f = function(x){ return a*x*x + b*x + c; };
      curve.setAttribute('d', plot.funcPath(f, -6, 6, 0.05));
      var vx = a!==0 ? -b/(2*a) : 0, vy = f(vx);
      vtx.setAttribute('cx', plot.sx(vx)); vtx.setAttribute('cy', plot.sy(vy));
      vtx.setAttribute('opacity', a!==0 ? 1 : 0);
      var head = 'y = ' + a + 'x² + ' + b + 'x + ' + c;
      if (a === 0){ out.innerHTML = head + '　｜　a=0 時退化成直線'; return; }
      // 用顯示的頂點 x 算頂點 y(可驗算);頂點 x 是否被四捨五入決定用 = 還是 ≈
      var vxr = Num.round(vx, 2), vyr = a*vxr*vxr + b*vxr + c;
      var eq = Num.sameAt(vx, vxr, 9) ? '=' : '≈';
      out.innerHTML = head + '　｜　頂點 ' + eq + ' (' + Num.show(vxr,2) + ', ' + Num.show(vyr,2) + ')';
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a', { min:-2, max:2, step:0.5, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    var bs = UI.sliderRow('b', { min:-4, max:4, step:1,   value:b }, function(v,o){ b=v; o.textContent=v; draw(); });
    var cs = UI.sliderRow('c', { min:-4, max:6, step:1,   value:c }, function(v,o){ c=v; o.textContent=v; draw(); });
    controls.append(as.row, bs.row, cs.row);

    var note = UI.note(
      '<span class="k">a</span> 決定開口:正的朝上、負的朝下,絕對值越大開口越窄。' +
      '<span class="k">c</span> 是 y 截距(x=0 時的高度)。橘點是<span class="y">頂點</span>——拋物線的最低點或最高點。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span class="p">a</span>x² + <span class="p">b</span>x + <span class="p">c</span>'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; bs.out.textContent = b; cs.out.textContent = c; draw();
    return {};
  }
});
