"use strict";
/* 橢圓  x²/a² + y²/b² = 1  —— 被拉長的圓;兩焦點距離和固定 */
registerGraph({
  id: 'ellipse',
  name: '橢圓',
  eq: 'x²/a²+y²/b²=1',
  group: '形狀 · 生成',
  create: function(root){
    var plot = createPlot({ xMin:-7, xMax:7, yMin:-7, yMax:7 });  // 範圍方形 → 不變形
    plot.grid(); plot.axes();

    var a = 5, b = 3;
    var ell = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var f1  = plot.el('circle', { r:4.5, fill:THEME.y });
    var f2  = plot.el('circle', { r:4.5, fill:THEME.y });
    var out = UI.readout();

    function draw(){
      ell.setAttribute('d', plot.paramPath(function(t){ return a*Math.cos(t); }, function(t){ return b*Math.sin(t); }, 0, 2*Math.PI + 0.02, 0.02));
      var c = Math.sqrt(Math.abs(a*a - b*b));   // 焦距
      if (a >= b){ f1.setAttribute('cx', plot.sx(c)); f1.setAttribute('cy', plot.sy(0)); f2.setAttribute('cx', plot.sx(-c)); f2.setAttribute('cy', plot.sy(0)); }
      else       { f1.setAttribute('cx', plot.sx(0)); f1.setAttribute('cy', plot.sy(c)); f2.setAttribute('cx', plot.sx(0)); f2.setAttribute('cy', plot.sy(-c)); }
      var same = (a === b);
      f1.setAttribute('opacity', same ? 0 : 1); f2.setAttribute('opacity', same ? 0 : 1);
      out.innerHTML = 'a = ' + a + ', b = ' + b + '　｜　' + (same ? 'a = b,這時就是正圓' : '圓在一個方向被拉長就成了橢圓');
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a (半徑x)', { min:1, max:6, step:1, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    var bs = UI.sliderRow('b (半徑y)', { min:1, max:6, step:1, value:b }, function(v,o){ b=v; o.textContent=v; draw(); });
    controls.append(as.row, bs.row);

    var note = UI.note(
      '橢圓就是被拉長(或壓扁)的圓。<span class="k">a</span>、<span class="k">b</span> 是兩個方向的半徑;當 a = b 時就回到正圓。' +
      '<span class="y">兩個橘點是焦點</span>:橢圓上任何一點到這兩個焦點的距離「相加」都一樣——這正是橢圓的定義(像用兩根釘子和一條繩子畫出來的)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('x²/<span class="p">a</span>² + y²/<span class="p">b</span>² = 1'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; bs.out.textContent = b; draw();
    return {};
  }
});
