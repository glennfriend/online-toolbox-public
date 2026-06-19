"use strict";
/* 絕對值  y = a|x − h| + k  —— V 形,頂點 (h, k) */
registerGraph({
  id: 'abs',
  name: '絕對值',
  eq: 'y=a|x−h|+k',
  group: '函數 · 線',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-6, yMax:6 });
    plot.grid(); plot.axes();

    var a = 1, h = 0, k = -1;
    var curve = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });
    var vtx   = plot.el('circle', { r:5, fill:THEME.y });
    var out   = UI.readout();

    function draw(){
      var f = function(x){ return a*Math.abs(x-h) + k; };
      curve.setAttribute('d', plot.funcPath(f, -6, 6, 0.05));
      vtx.setAttribute('cx', plot.sx(h)); vtx.setAttribute('cy', plot.sy(k));
      out.innerHTML = 'y = ' + a + '|x − (' + h + ')| + (' + k + ')　｜　頂點 = (' + h + ', ' + k + ')';
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a', { min:-2, max:2, step:0.5, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    var hs = UI.sliderRow('h', { min:-4, max:4, step:1,   value:h }, function(v,o){ h=v; o.textContent=v; draw(); });
    var ks = UI.sliderRow('k', { min:-4, max:4, step:1,   value:k }, function(v,o){ k=v; o.textContent=v; draw(); });
    controls.append(as.row, hs.row, ks.row);

    var note = UI.note(
      '絕對值把負數變正數,所以圖形是個 <span class="k">V</span> 形。' +
      '<span class="y">頂點</span>在 (h, k):<span class="k">h</span> 左右平移、<span class="k">k</span> 上下平移。' +
      '<span class="k">a</span> 控制開口寬窄與方向(負的就倒過來變 Λ)。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span class="p">a</span>|x − <span class="p">h</span>| + <span class="p">k</span>'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; hs.out.textContent = h; ks.out.textContent = k; draw();
    return {};
  }
});
