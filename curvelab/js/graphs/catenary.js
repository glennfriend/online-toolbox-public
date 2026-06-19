"use strict";
/* 懸鏈線  y = a·cosh(x/a)  —— 下垂的鏈條/電線,看似拋物線卻不是 */
registerGraph({
  id: 'catenary',
  name: '懸鏈線',
  eq: 'y=a cosh(x/a)',
  group: '函數 · 線',
  create: function(root){
    var plot = createPlot({ xMin:-6, xMax:6, yMin:-1, yMax:8 });
    plot.grid(); plot.axes();

    var a = 2;
    var cosh = function(u){ return (Math.exp(u) + Math.exp(-u)) / 2; };
    var para  = plot.el('path', { fill:'none', stroke:THEME.y, 'stroke-width':1.5, 'stroke-dasharray':'4 4' });
    var chain = plot.el('path', { fill:'none', stroke:THEME.accent, 'stroke-width':2.5, 'stroke-linejoin':'round' });
    var out = UI.readout();

    function draw(){
      chain.setAttribute('d', plot.funcPath(function(x){ return a*cosh(x/a); }, -6, 6, 0.05));
      para.setAttribute('d',  plot.funcPath(function(x){ return a + x*x/(2*a); }, -6, 6, 0.05));  // 底部最接近的拋物線
      out.innerHTML = 'a = ' + a + '　｜　<span class="accent">綠</span>:懸鏈線　<span class="y">橘虛線</span>:最接近的拋物線';
    }

    var controls = UI.controls();
    var as = UI.sliderRow('a (鬆緊)', { min:1, max:4, step:0.5, value:a }, function(v,o){ a=v; o.textContent=v; draw(); });
    controls.append(as.row);

    var note = UI.note(
      '把一條鏈條或電線兩端吊起來,它自然下垂的形狀就是懸鏈線(catenary)。' +
      '它<span class="k">很像拋物線但其實不是</span>:<span class="y">橘色虛線</span>是最接近的拋物線——底部幾乎重合,越往兩側張開差得越多。' +
      '<span class="k">a</span> 越小垂得越深、越尖。'
    );

    var panel = document.createElement('div'); panel.className='panel';
    panel.append(UI.eq('y = <span class="p">a</span>·cosh(x/<span class="p">a</span>)'), out, UI.plotWrap(plot.svg, false), controls, note);
    root.appendChild(panel);

    as.out.textContent = a; draw();
    return {};
  }
});
