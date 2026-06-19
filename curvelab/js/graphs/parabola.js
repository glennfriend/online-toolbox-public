"use strict";
/* 拋物線(曲線生成)  y = x²  —— 點沿 x 掃過去,沿路把曲線「畫」出來 */
registerGraph({
  id: 'parabola',
  name: '拋物線',
  eq: 'y=x²',
  create: function(root){
    var plot = createPlot({ xMin:-4, xMax:4, yMin:-2, yMax:16 });
    plot.grid(); plot.axes();
    var f = function(x){ return x*x; };

    plot.el('path', { d:plot.funcPath(f,-4,4,0.04), fill:'none', stroke:THEME.line, 'stroke-width':2, 'stroke-dasharray':'2 4' });
    var trail = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':3, 'stroke-linejoin':'round', 'stroke-linecap':'round' });
    var projX = plot.el('line', { stroke:THEME.x, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
    var projY = plot.el('line', { stroke:THEME.y, 'stroke-width':1.5, 'stroke-dasharray':'4 3' });
    var pt    = plot.el('circle', { r:6.5, fill:THEME.accent });

    var cx = -4, playing = false, raf = null, alive = true;
    var out = UI.readout();
    var slider;
    function draw(){
      var y=f(cx), px=plot.sx(cx), py=plot.sy(y);
      trail.setAttribute('d', plot.funcPath(f, -4, cx, 0.04));
      projX.setAttribute('x1',px); projX.setAttribute('y1',plot.sy(0)); projX.setAttribute('x2',px); projX.setAttribute('y2',py);
      projY.setAttribute('x1',px); projY.setAttribute('y1',py);        projY.setAttribute('x2',plot.sx(0)); projY.setAttribute('y2',py);
      pt.setAttribute('cx',px); pt.setAttribute('cy',py);
      out.innerHTML = '<span style="color:'+THEME.x+'">x = '+cx.toFixed(1)+'</span> → <span style="color:'+THEME.y+'">y = '+y.toFixed(1)+'</span>';
      if (slider){ slider.input.value = cx; slider.out.textContent = cx.toFixed(1); }
    }
    var playBtn = UI.button('▶ 播放', function(){
      if (playing){ playing=false; playBtn.textContent='▶ 播放'; return; }
      if (cx >= 4) cx = -4;
      playing = true; playBtn.textContent='⏸ 暫停';
      (function tick(){ if(!playing||!alive) return; cx += 0.035; if(cx>=4){cx=4; playing=false; playBtn.textContent='▶ 播放';} draw(); if(playing) raf=requestAnimationFrame(tick); })();
    });

    var controls = UI.controls();
    var row = document.createElement('div'); row.className='ctl-row';
    slider = UI.sliderRow('x', { min:-4, max:4, step:0.1, value:cx }, function(v){ playing=false; playBtn.textContent='▶ 播放'; cx=v; draw(); });
    var lab = document.createElement('label'); lab.textContent='x'; lab.style.fontFamily='var(--mono)';
    row.append(playBtn, lab, slider.row.children[1], slider.out);
    controls.appendChild(row);

    var note = UI.note(
      '一條曲線是「點的集合」。你<span class="x">選一個 x</span>(直虛線),公式幫你<span class="y">算出 y</span>(橫虛線),' +
      '就得到曲線上的一個點。點從左掃到右,沿路留下的軌跡就是整條曲線。每個 x 只會對到一個 y,這就是「函數」。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = x²'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    draw();
    return { destroy: function(){ alive=false; playing=false; if(raf) cancelAnimationFrame(raf); } };
  }
});
