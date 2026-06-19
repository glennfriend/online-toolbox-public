"use strict";
/* 方程式的解  f(x) = 0  →  數線上的點
 * 使用者可自由輸入只含 x 的式子;用數值法(見 expr.js 的 findRoots)找根,標在 x 軸(數線)上。
 * 可切換「顯示曲線 / 只看數線」,呈現「平面曲線 → 數線上的點」的關係。 */
registerGraph({
  id: 'roots',
  name: '方程式的解',
  eq: 'f(x)=0',
  create: function(root){
    var X0=-6, X1=6, Y0=-6, Y1=10;

    var eqEl = UI.eq('f(x) = 0　<span style="font-size:14px;color:var(--muted)">的解在哪裡?</span>');
    var out  = UI.readout();
    var wrap = document.createElement('div'); wrap.className='plot-wrap';

    var showCurve = true, expr = 'x^2 - 5x + 6';

    function render(){
      var plot = createPlot({ xMin:X0, xMax:X1, yMin:Y0, yMax:Y1 });
      plot.grid();
      if (showCurve) plot.el('line', { x1:plot.sx(0), y1:0, x2:plot.sx(0), y2:plot.H, stroke:THEME.muted, 'stroke-width':1.5 });
      plot.el('line', { x1:0, y1:plot.sy(0), x2:plot.W, y2:plot.sy(0), stroke:THEME.ink, 'stroke-width':2.5 });

      var f=null, err=null;
      try { f = Expr.compile(expr); f(0); } catch(e){ err = e.message; }

      if (f && showCurve){
        plot.el('path', { d:plot.funcPath(f, X0, X1, 0.03), fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });
      }

      if (f && !err){
        var roots = findRoots(f).filter(function(r){ return r>=X0-0.001 && r<=X1+0.001; });
        roots.forEach(function(r){
          plot.el('circle', { cx:plot.sx(r), cy:plot.sy(0), r:6, fill:THEME.y });
          plot.el('text', { x:plot.sx(r), y:plot.sy(0)+20, 'text-anchor':'middle',
                            fill:THEME.y, style:'font-size:12px;font-family:var(--mono)' }).textContent = r;
        });
      }

      wrap.innerHTML=''; wrap.appendChild(plot.svg);

      if (err){ out.innerHTML = '<span class="err">看不懂這個式子('+err+')</span>'; }
      else {
        var all = findRoots(f);
        if (!all.length) out.textContent = '在 −30 ～ 30 之間找不到實數解';
        else if (all.length > 8) out.innerHTML = 'f(x) = 0 的解:x = ' + all.slice(0,8).join(', ') + ' …(共 ' + all.length + ' 個)';
        else out.innerHTML = 'f(x) = 0 的解:x = ' + all.join(', ');
      }
    }

    var controls = UI.controls();
    var inputRow = document.createElement('div'); inputRow.className='ctl-row';
    var lab = document.createElement('label'); lab.textContent='f(x)';
    var input = document.createElement('input'); input.type='text'; input.value=expr;
    inputRow.append(lab, input);
    input.addEventListener('input', function(){ expr = input.value; render(); });

    var presetWrap = document.createElement('div'); presetWrap.className='presets';
    ['x^2 - 5x + 6', 'x^2 - 2', 'x^3 - x', 'sin(x)'].forEach(function(p){
      presetWrap.appendChild(UI.button(p, function(){ expr=p; input.value=p; render(); }));
    });

    var toggleRow = document.createElement('div'); toggleRow.className='ctl-row';
    var toggle = UI.button('只看數線', function(){
      showCurve = !showCurve;
      toggle.textContent = showCurve ? '只看數線' : '顯示曲線';
      render();
    });
    toggleRow.appendChild(toggle);

    controls.append(inputRow, presetWrap, toggleRow);

    var note = UI.note(
      '把 y 想成「f(x) 算出來的值」。曲線<span class="y">碰到 x 軸(y=0)的地方</span>,就是方程式 f(x)=0 的解。' +
      '按「只看數線」會把曲線藏起來,只留下 x 軸——這時你看到的就是「<span class="k">1 個未知數的解 = 數線上的幾個點</span>」。' +
      '可輸入任何只含 x 的式子,例如 <span class="k">x^2-5x+6</span>、<span class="k">x^3-x</span>、<span class="k">sin(x)</span>。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(eqEl, out, wrap, controls, note);
    root.appendChild(panel);

    render();
    return {};
  }
});
