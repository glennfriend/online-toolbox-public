"use strict";
/* 畢氏定理  a² + b² = c²  —— 直角三角形三邊上的正方形面積關係(國中幾何) */
registerGraph({
  id: 'pythagoras',
  name: '畢氏定理',
  eq: 'a²+b²=c²',
  create: function(root){
    // x、y 範圍都是 18,搭配方形 SVG → 兩軸等比例,直角看起來才是真的直角
    var plot = createPlot({ xMin:-6, xMax:12, yMin:-6, yMax:12 });
    plot.grid(); plot.axes();

    var a = 3, b = 4;

    function poly(pts){ return 'M' + pts.map(function(p){ return plot.sx(p[0]).toFixed(1) + ' ' + plot.sy(p[1]).toFixed(1); }).join(' L ') + ' Z'; }

    var sqA = plot.el('path', { fill:THEME.x, 'fill-opacity':0.18, stroke:THEME.x, 'stroke-width':1.5 });
    var sqB = plot.el('path', { fill:THEME.y, 'fill-opacity':0.18, stroke:THEME.y, 'stroke-width':1.5 });
    var sqC = plot.el('path', { fill:THEME.accent, 'fill-opacity':0.18, stroke:THEME.accent, 'stroke-width':1.5 });
    var tri = plot.el('path', { fill:THEME.muted, 'fill-opacity':0.25, stroke:THEME.ink, 'stroke-width':2 });
    function label(){ return plot.el('text', { 'text-anchor':'middle', 'dominant-baseline':'middle', style:'font-size:13px;font-family:var(--mono);font-weight:600' }); }
    var lA = label(), lB = label(), lC = label();
    var out = UI.readout();

    function draw(){
      // 直角在原點 O,水平股 a 沿 x,垂直股 b 沿 y
      tri.setAttribute('d', poly([[0,0],[a,0],[0,b]]));
      sqA.setAttribute('d', poly([[0,0],[a,0],[a,-a],[0,-a]]));          // a 邊上的正方形(下方)
      sqB.setAttribute('d', poly([[0,0],[0,b],[-b,b],[-b,0]]));          // b 邊上的正方形(左方)
      sqC.setAttribute('d', poly([[a,0],[a+b,a],[b,a+b],[0,b]]));        // 斜邊上的正方形(外側)

      lA.setAttribute('x', plot.sx(a/2));     lA.setAttribute('y', plot.sy(-a/2));      lA.setAttribute('fill', THEME.x); lA.textContent = 'a² = ' + (a*a);
      lB.setAttribute('x', plot.sx(-b/2));    lB.setAttribute('y', plot.sy(b/2));       lB.setAttribute('fill', THEME.y); lB.textContent = 'b² = ' + (b*b);
      lC.setAttribute('x', plot.sx((a+b)/2)); lC.setAttribute('y', plot.sy((a+b)/2));   lC.setAttribute('fill', THEME.accent); lC.textContent = 'c² = ' + (a*a+b*b);

      var c = Math.sqrt(a*a + b*b);
      out.innerHTML = a + '² + ' + b + '² = ' + (a*a) + ' + ' + (b*b) + ' = ' + (a*a+b*b) + ' = c²　→　c = ' + (Number.isInteger(c) ? c : c.toFixed(2));
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a (股)', { min:1, max:5, step:1, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    var bs = UI.sliderRow('b (股)', { min:1, max:5, step:1, value:b }, function(v,o){ b=v; o.textContent=v; draw(); });
    controls.append(as.row, bs.row);

    var note = UI.note(
      '直角三角形的兩股是 <span class="x">a</span>、<span class="y">b</span>,斜邊是 <span class="k">c</span>。' +
      '三邊各自畫一個正方形,面積分別是 a²、b²、c²。' +
      '畢氏定理說:<span class="x">a²</span> + <span class="y">b²</span> = <span class="k">c²</span>——兩個小正方形面積加起來,剛好等於大正方形。試試 a=3、b=4 → c=5。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('<span class="p">a</span>² + <span class="p">b</span>² = <span class="p">c</span>²'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; bs.out.textContent = b; draw();
    return {};
  }
});
