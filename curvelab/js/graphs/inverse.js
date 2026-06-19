"use strict";
/* 反比(雙曲線)  y = k / x  —— 國中:反比例 */
registerGraph({
  id: 'inverse',
  name: '反比',
  eq: 'y=k/x',
  group: '函數 · 線',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });
    plot.grid(); plot.axes();

    var k = 3;
    var c1 = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var c2 = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var out = UI.readout();

    function draw(){
      var f = function(x){ return k/x; };
      c1.setAttribute('d', plot.funcPath(f, 0.05, 6, 0.02));
      c2.setAttribute('d', plot.funcPath(f, -6, -0.05, 0.02));
      out.innerHTML = 'y = ' + k + ' / x　｜　不管 x 是多少,<span class="x">x</span> × <span class="y">y</span> = ' + k + '(固定)';
    }

    var controls = UI.controls();
    var ks = UI.sliderRow('k', { min:-6, max:6, step:1, value:k }, function(v,o){ if(v===0) v=1; k=v; o.textContent=v; draw(); });
    controls.append(ks.row);

    var note = UI.note(
      '反比:兩個量相乘是定值 <span class="k">k</span>(<span class="x">x</span> × <span class="y">y</span> = k)。' +
      'x 變大,y 就跟著變小。曲線分成兩條(雙曲線),而且永遠碰不到座標軸——越靠近軸越貼近卻碰不到,這叫漸近線。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span class="p">k</span> / x'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    ks.out.textContent = k; draw();
    return {};
  }
});
