"use strict";
/* 星形線  x = a·cos³t, y = a·sin³t  —— 小圓在大圓內滾動的軌跡 */
registerGraph({
  id: 'astroid',
  name: '星形線',
  eq: 'x=a cos³t',
  create: function(root){
    var a = 3;
    var plot = createPlot({ xMin:-3.6, xMax:3.6, yMin:-3.6, yMax:3.6 });  // 方形 → 不變形
    plot.grid(); plot.axes();

    var out = UI.readout();
    var tracer = UI.tracer(plot, {
      fx: function(t){ var c=Math.cos(t); return a*c*c*c; },
      fy: function(t){ var s=Math.sin(t); return a*s*s*s; },
      tMin: 0, tMax: 2*Math.PI, frames: 220, step: 0.01,
      onDraw: function(t){ out.innerHTML = 't = ' + (t*180/Math.PI).toFixed(0) + '°'; }
    });

    var note = UI.note(
      '想像一個小圓在大圓的<span class="x">內側</span>滾動,小圓上一點走過的路徑,就是這個有四個尖角、邊向內凹的星形(內擺線的一種)。' +
      '它的參數式用了三次方的 cos、sin,讓四個角特別尖。按播放看點怎麼描出星形。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('x = <span class="p">a</span> cos³t,　y = <span class="p">a</span> sin³t'), out, UI.plotWrap(plot.svg, false), tracer.controls, note);
    root.appendChild(panel);

    return { destroy: tracer.destroy };
  }
});
