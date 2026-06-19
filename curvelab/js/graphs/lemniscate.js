"use strict";
/* 雙紐線(∞)  r² = a²·cos(2θ)  —— 到兩定點距離「相乘」固定的點 */
registerGraph({
  id: 'lemniscate',
  name: '雙紐線',
  eq: '∞ 形',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });   // 方形 → 不變形
    plot.grid(); plot.axes();

    var a = 4;
    var curve = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5 });
    var out = UI.readout();

    function draw(){
      // r = a√(cos2θ),只在 cos2θ ≥ 0 的角度有定義;其餘交給 paramPath 抬筆
      var fx = function(t){ var c=Math.cos(2*t); return c<0?NaN:a*Math.sqrt(c)*Math.cos(t); };
      var fy = function(t){ var c=Math.cos(2*t); return c<0?NaN:a*Math.sqrt(c)*Math.sin(t); };
      curve.setAttribute('d', plot.paramPath(fx, fy, 0, 2*Math.PI, 0.01));
      out.innerHTML = 'a = ' + a + '　｜　像躺平的 8 / 無限符號 ∞';
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a (大小)', { min:2, max:6, step:1, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    controls.append(as.row);

    var note = UI.note(
      '雙紐線是一條 ∞ 形曲線。它的定義很特別:取兩個定點,所有「到這兩點的距離<span class="k">相乘</span>剛好固定」的點,就連成這條線。' +
      '(對照橢圓是距離「相加」固定。)極座標寫成 r² = a²·cos(2θ)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('r² = <span class="p">a</span>²·cos(2θ)'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; draw();
    return {};
  }
});
