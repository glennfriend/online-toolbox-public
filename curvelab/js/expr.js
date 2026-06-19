"use strict";
/* 共用 library:小型運算式解析器(無外部相依,避免 eval)。
 * tokenize → shunting-yard(RPN)→ eval。供「方程式的解」等需要解析使用者輸入的圖使用。 */
var Expr = (function(){
  var FUNCS = ['sin','cos','tan','sqrt','abs','exp','ln','log'];
  var FN = { sin:Math.sin, cos:Math.cos, tan:Math.tan, sqrt:Math.sqrt, abs:Math.abs,
             exp:Math.exp, ln:Math.log, log:(Math.log10||function(v){ return Math.log(v)/Math.LN10; }) };
  var PREC = { '+':2,'-':2,'*':3,'/':3,'~':4,'^':5 };
  var RIGHT = { '^':true, '~':true };

  function tokenize(s){
    s = s.replace(/\s+/g,''); var out=[]; var i=0;
    while (i < s.length){
      var c = s[i];
      if (/[0-9.]/.test(c)){ var j=i+1; while(j<s.length && /[0-9.]/.test(s[j])) j++; out.push({t:'num',v:parseFloat(s.slice(i,j))}); i=j; continue; }
      if (/[a-zA-Z]/.test(c)){
        var k=i+1; while(k<s.length && /[a-zA-Z]/.test(s[k])) k++;
        var name = s.slice(i,k).toLowerCase(); i=k;
        if (FUNCS.indexOf(name)>=0) out.push({t:'func',v:name});
        else if (name==='x')  out.push({t:'var'});
        else if (name==='pi') out.push({t:'num',v:Math.PI});
        else if (name==='e')  out.push({t:'num',v:Math.E});
        else throw new Error('不認識的符號:'+name);
        continue;
      }
      if ('+-*/^'.indexOf(c)>=0){ out.push({t:'op',v:c}); i++; continue; }
      if (c==='('){ out.push({t:'lp'}); i++; continue; }
      if (c===')'){ out.push({t:'rp'}); i++; continue; }
      throw new Error('看不懂的字元:'+c);
    }
    // 隱含乘法:2x → 2*x、2sin(x) → 2*sin(x)、x(x+1) → x*(x+1)
    var res=[];
    for (var m=0;m<out.length;m++){
      res.push(out[m]); var a=out[m], b=out[m+1]; if(!b) continue;
      var aEnd = (a.t==='num'||a.t==='var'||a.t==='rp');
      var bStart = (b.t==='num'||b.t==='var'||b.t==='func'||b.t==='lp');
      if (aEnd && bStart) res.push({t:'op',v:'*'});
    }
    return res;
  }

  function toRPN(tokens){
    var out=[], ops=[]; var prev=null;
    for (var n=0;n<tokens.length;n++){
      var tk = tokens[n];
      if (tk.t==='num' || tk.t==='var'){ out.push(tk); }
      else if (tk.t==='func'){ ops.push(tk); }
      else if (tk.t==='op'){
        var v = tk.v;
        var unary = (v==='-'||v==='+') && (prev===null||prev==='op'||prev==='lp');
        if (unary){ if(v==='+'){ prev='op'; continue; } v='~'; }
        while (ops.length){
          var top = ops[ops.length-1];
          if (top.t==='func'){ out.push(ops.pop()); continue; }
          if (top.t==='op'){ var tp=PREC[top.v], cp=PREC[v]; if (tp>cp || (tp===cp && !RIGHT[v])){ out.push(ops.pop()); continue; } }
          break;
        }
        ops.push({t:'op',v:v});
      }
      else if (tk.t==='lp'){ ops.push(tk); }
      else if (tk.t==='rp'){
        while (ops.length && ops[ops.length-1].t!=='lp') out.push(ops.pop());
        if (!ops.length) throw new Error('括號不對稱');
        ops.pop();
        if (ops.length && ops[ops.length-1].t==='func') out.push(ops.pop());
      }
      prev = tk.t==='op' ? 'op' : (tk.t==='lp'?'lp':(tk.t==='rp'?'rp':'val'));
    }
    while (ops.length){ var o=ops.pop(); if(o.t==='lp') throw new Error('括號不對稱'); out.push(o); }
    return out;
  }

  function evalRPN(rpn, x){
    var st=[];
    for (var i=0;i<rpn.length;i++){
      var tk = rpn[i];
      if (tk.t==='num') st.push(tk.v);
      else if (tk.t==='var') st.push(x);
      else if (tk.t==='op'){
        if (tk.v==='~') st.push(-st.pop());
        else { var b=st.pop(), a=st.pop();
          st.push(tk.v==='+'?a+b: tk.v==='-'?a-b: tk.v==='*'?a*b: tk.v==='/'?a/b: Math.pow(a,b)); }
      }
      else if (tk.t==='func') st.push(FN[tk.v](st.pop()));
    }
    if (st.length!==1) throw new Error('式子不完整');
    return st[0];
  }

  return { compile: function(expr){ var rpn = toRPN(tokenize(expr)); return function(x){ return evalRPN(rpn, x); }; } };
})();

/* 數值法找根:在範圍內密集取樣,偵測符號改變的區間,以二分法逼近,去重、四捨五入到漂亮數字。 */
function findRoots(f, a, b, step){
  a = a==null?-30:a; b = b==null?30:b; step = step||0.02;
  var safe = function(x){ var y; try{ y=f(x); }catch(_){ y=NaN; } return isFinite(y)?y:NaN; };
  var bisect = function(lo, hi){ var flo=safe(lo); for(var k=0;k<50;k++){ var mid=(lo+hi)/2, fm=safe(mid); if(fm===0) return mid; if(flo*fm<0){ hi=mid; } else { lo=mid; flo=fm; } } return (lo+hi)/2; };
  var roots=[]; var px=a, py=safe(a);
  for (var x=a+step; x<=b; x+=step){
    var cy=safe(x);
    if (isFinite(py) && isFinite(cy)){
      if (py===0) roots.push(px);
      else if (py*cy<0) roots.push(bisect(px,x));
    }
    px=x; py=cy;
  }
  var uniq=[];
  for (var i=0;i<roots.length;i++){ var r=roots[i]; var dup=false; for(var u=0;u<uniq.length;u++){ if(Math.abs(uniq[u]-r)<0.05){dup=true;break;} } if(!dup) uniq.push(r); }
  return uniq.map(function(r){ var ri=Math.round(r); return Math.abs(r-ri)<0.015 ? ri : Math.round(r*100)/100; });
}
