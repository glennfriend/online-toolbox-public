"use strict";
/* 圖形註冊表 + App 外殼。
 * 要新增一個圖,就在 js/graphs/ 下新增一個檔案,在裡面 registerGraph({...}) 一個物件,
 * 再到 index.html 把它的 <script> 加進載入清單即可——核心完全不用動。
 *
 * 模組介面:{ id, name, eq(可選按鈕副標), create(root) -> {destroy?} } */
var GRAPHS = [];
function registerGraph(g){ GRAPHS.push(g); }

var App = (function(){
  var stage, tabs;
  var current = null;       // 目前模組的控制器(可能有 destroy)

  function select(id){
    if (current && current.destroy) current.destroy();   // 收掉上一個圖(停動畫等)
    stage.innerHTML = '';
    var g = null;
    for (var i=0;i<GRAPHS.length;i++) if (GRAPHS[i].id===id) g = GRAPHS[i];
    current = g.create(stage) || {};
    var kids = tabs.children;
    for (var k=0;k<kids.length;k++) kids[k].classList.toggle('active', kids[k].dataset.id === id);
  }

  function init(){
    stage = document.getElementById('stage');
    tabs  = document.getElementById('tabs');
    GRAPHS.forEach(function(g){
      var b = document.createElement('button');
      b.className = 'tab'; b.dataset.id = g.id;
      b.innerHTML = g.name + '<small>' + (g.eq || '') + '</small>';
      b.addEventListener('click', function(){ select(g.id); });
      tabs.appendChild(b);
    });
    if (GRAPHS.length) select(GRAPHS[0].id);
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);
