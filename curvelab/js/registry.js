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
    var allTabs = tabs.querySelectorAll('.tab');
    for (var k=0;k<allTabs.length;k++) allTabs[k].classList.toggle('active', allTabs[k].dataset.id === id);
  }

  function makeTab(g){
    var b = document.createElement('button');
    b.className = 'tab'; b.dataset.id = g.id;
    b.innerHTML = g.name + '<small>' + (g.eq || '') + '</small>';
    b.addEventListener('click', function(){ select(g.id); });
    return b;
  }

  function init(){
    stage = document.getElementById('stage');
    tabs  = document.getElementById('tabs');

    // 依 group 分欄(欄的順序 = 各 group 第一次出現的順序);沒寫 group 的歸到「其他」
    var order = [], byGroup = {};
    GRAPHS.forEach(function(g){
      var key = g.group || '其他';
      if (!byGroup[key]){ byGroup[key] = []; order.push(key); }
      byGroup[key].push(g);
    });
    order.forEach(function(key){
      var col = document.createElement('div'); col.className = 'tab-col';
      var h = document.createElement('div'); h.className = 'tab-col-h'; h.textContent = key;
      col.appendChild(h);
      byGroup[key].forEach(function(g){ col.appendChild(makeTab(g)); });
      tabs.appendChild(col);
    });

    if (GRAPHS.length) select(GRAPHS[0].id);
  }

  return { init: init };
})();
// App.init() 由 index.html 的載入器在所有 JS 載入完成後呼叫(不再用 DOMContentLoaded,
// 因為動態載入的 script 可能比 DOMContentLoaded 還晚執行)。
