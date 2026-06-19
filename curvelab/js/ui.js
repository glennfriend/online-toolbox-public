"use strict";
/* 共用 library:UI 小工具,減少各模組重複的版面程式碼。 */
var UI = {
  eq: function(html){ var d = document.createElement('div'); d.className='eq'; d.innerHTML=html; return d; },
  readout: function(){ var d = document.createElement('div'); d.className='readout'; return d; },
  note: function(html){ var d = document.createElement('div'); d.className='note'; d.innerHTML=html; return d; },
  plotWrap: function(svg, grabbable){
    var d = document.createElement('div');
    d.className = 'plot-wrap' + (grabbable ? ' grab' : '');
    d.appendChild(svg); return d;
  },
  controls: function(){ var d = document.createElement('div'); d.className='controls'; return d; },
  sliderRow: function(label, cfg, onInput){
    var row = document.createElement('div'); row.className='ctl-row';
    var lab = document.createElement('label'); lab.textContent = label;
    var inp = document.createElement('input'); inp.type='range';
    inp.min=cfg.min; inp.max=cfg.max; inp.step=cfg.step; inp.value=cfg.value;
    var out = document.createElement('span'); out.className='val';
    row.append(lab, inp, out);
    inp.addEventListener('input', function(){ onInput(parseFloat(inp.value), out, inp); });
    return { row:row, input:inp, out:out };
  },
  button: function(label, onClick){
    var b = document.createElement('button'); b.className='btn'; b.textContent=label;
    b.addEventListener('click', onClick); return b;
  },

  /* 共用「描繪器」:給一條參數曲線 (fx(t), fy(t)),提供
   *   - 底圖:整條曲線的淡色虛線(ghost)
   *   - 軌跡:從起點掃到目前 t 的實線(trail)
   *   - 一顆沿曲線移動的點
   *   - 播放鈕 + t 滑桿(可手動掃)
   * 各「生成型」的圖(正弦、擺線、螺線、心臟線、星形線…)共用它,
   * 只要再用 opts.decorate 加上自己的招牌示意(滾動的圓、旋轉半徑…)。
   *
   * opts: { fx, fy, tMin, tMax, step?, ghost?, decorate?(plot)->fn(t),
   *         onDraw?(t,X,Y), fmt?(t)->string, frames? } */
  tracer: function(plot, opts){
    var tMin = opts.tMin, tMax = opts.tMax;
    var step = opts.step || (tMax - tMin) / 400;
    var fx = opts.fx, fy = opts.fy;

    if (opts.ghost !== false)
      plot.el('path', { d:plot.paramPath(fx, fy, tMin, tMax, step), fill:'none',
                        stroke:THEME.line, 'stroke-width':2, 'stroke-dasharray':'2 4' });

    var update = (typeof opts.decorate === 'function') ? opts.decorate(plot) : null;
    var trail = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':3,
                                  'stroke-linejoin':'round', 'stroke-linecap':'round' });
    var pt = plot.el('circle', { r:6, fill:THEME.accent });

    var t = tMin, playing = false, raf = null, alive = true;
    var slider, playBtn;
    var tLabel = opts.tLabel || 't';   // 參數顯示名稱(預設 t;若參數其實就是 x,可傳 'x')

    function draw(){
      trail.setAttribute('d', plot.paramPath(fx, fy, tMin, t, step));
      var X = fx(t), Y = fy(t);
      if (isFinite(X) && isFinite(Y)){
        pt.setAttribute('cx', plot.sx(X)); pt.setAttribute('cy', plot.sy(Y));
        pt.setAttribute('opacity', 1);
      } else { pt.setAttribute('opacity', 0); }
      if (update) update(t);
      if (opts.onDraw) opts.onDraw(t, X, Y);
      if (slider){ slider.input.value = t; slider.out.textContent = opts.fmt ? opts.fmt(t) : t.toFixed(2); }
    }

    playBtn = UI.button('▶ 播放', function(){
      if (playing){ playing=false; playBtn.textContent='▶ 播放'; return; }
      if (t >= tMax) t = tMin;
      playing = true; playBtn.textContent='⏸ 暫停';
      var dt = (tMax - tMin) / (opts.frames || 240);
      (function tick(){
        if (!playing || !alive) return;
        t += dt; if (t >= tMax){ t = tMax; playing=false; playBtn.textContent='▶ 播放'; }
        draw(); if (playing) raf = requestAnimationFrame(tick);
      })();
    });

    var controls = UI.controls();
    var row = document.createElement('div'); row.className='ctl-row';
    slider = UI.sliderRow('t', { min:tMin, max:tMax, step:step, value:t }, function(v){
      playing=false; playBtn.textContent='▶ 播放'; t=v; draw();
    });
    var lab = document.createElement('label'); lab.textContent=tLabel; lab.style.fontFamily='var(--mono)';
    row.append(playBtn, lab, slider.row.children[1], slider.out);
    controls.appendChild(row);

    draw();
    return { controls:controls, draw:draw,
             destroy: function(){ alive=false; playing=false; if (raf) cancelAnimationFrame(raf); } };
  },
};
