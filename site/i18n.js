// 화면 언어: 엔진은 언제나 한국어로 그리고, 영어일 때만 보이는 글자를 바꿔 끼운다.
// 저장(localStorage)·시즌 연결·음성은 한국어 원문 그대로라, 언어를 바꿔도 진행 기록이 깨지지 않는다.
// 사전은 i18n/en.js(I18N_EN: 한국어 문장 → 영어). 문단은 문장 단위로 나눠 찾고, 없는 문장은 한국어로 둔다.
(function(){
  var KEY='hojeoge-lang',LANGS=['ko','en'];
  function pick(){
    var q=/[?&]lang=(ko|en)\b/.exec(location.search);
    if(q){try{localStorage.setItem(KEY,q[1]);}catch(e){}return q[1];}
    try{var s=localStorage.getItem(KEY);if(LANGS.indexOf(s)>=0)return s;}catch(e){}
    var list=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'ko'];
    return /^ko\b/i.test(list[0]||'ko')?'ko':'en'; // 한국어 브라우저가 아니면 영어(지금 있는 번역이 영어뿐)
  }
  var lang=pick();
  var api={lang:lang,split:split,norm:norm,set:function(l){
    try{localStorage.setItem(KEY,l);}catch(e){}
    // 만화는 첫 화면(index.html) 안의 iframe에서 열린다: 첫 화면째 다시 불러 읽던 시즌으로 돌아간다
    try{if(window.top!==window){window.top.location.hash='read';window.top.location.reload();return;}}catch(e){}
    location.reload();
  }};
  window.HOJEOGE_I18N=api;
  function norm(t){return String(t).replace(/\s+/g,' ').trim();}
  // 문장 나누기: 마침표·물음표·느낌표(닫는 따옴표 포함) 뒤의 빈칸에서 자른다. 사전 만들기 도구도 이 함수를 쓴다.
  function split(t){var m=norm(t).match(/[^.?!…]+(?:[.?!…]+[”"'」』)]*)?|[.?!…]+[”"'」』)]*/g)||[];var out=[];for(var i=0;i<m.length;i++){var p=m[i].trim();if(p)out.push(p);}return out;}
  if(lang!=='en')return;
  document.documentElement.lang='en';
  document.documentElement.classList.add('lang-en');
  if(document.readyState==='loading')document.write('<script src="i18n/en.js"><\/script>');
  var HANGUL=/[가-힣]/,done=new WeakMap(),missing=api.missing=new Set();
  function dict(){return window.I18N_EN||{};}
  function tr(text){
    var d=dict(),whole=norm(text);
    if(!HANGUL.test(whole))return null;
    if(d[whole]!=null)return d[whole];
    var parts=split(whole),out=[],hit=false;
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      if(d[p]!=null){out.push(d[p]);hit=true;}
      else{out.push(p);if(HANGUL.test(p))missing.add(p);}
    }
    return hit?out.join(' '):null;
  }
  function skip(el){return el&&(/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)||(el.closest&&el.closest('[data-no-i18n]')));}
  function textNode(n){
    if(done.get(n)===n.nodeValue)return;
    if(skip(n.parentNode)){done.set(n,n.nodeValue);return;}
    var v=n.nodeValue,t=tr(v);
    if(t==null){done.set(n,v);return;}
    var lead=/^\s/.test(v)&&!/^[.,;:!?)]/.test(t)?' ':'',tail=/\s$/.test(v)?' ':'';
    var p=n.parentNode;
    // 음성(voice.js)은 한국어 원문으로 대사를 찾는다: 말풍선·이름 칸에 원문을 남긴다
    if(p&&p.nodeType===1&&!p.hasAttribute('data-ko')&&p.childNodes.length===1)p.setAttribute('data-ko',norm(v));
    n.nodeValue=lead+t+tail;done.set(n,n.nodeValue);
  }
  var ATTRS=['aria-label','title','alt','placeholder','content'];
  function element(el){
    if(skip(el))return;
    for(var i=0;i<ATTRS.length;i++){
      var a=ATTRS[i];if(!el.hasAttribute||!el.hasAttribute(a))continue;
      if(a==='content'&&!/^(description|og:title|og:description)$/.test(el.getAttribute('name')||el.getAttribute('property')||''))continue;
      var t=tr(el.getAttribute(a));if(t!=null)el.setAttribute(a,t);
    }
  }
  function walk(root){
    if(!root)return;
    if(root.nodeType===3){textNode(root);return;}
    if(root.nodeType!==1&&root.nodeType!==9)return;
    if(root.nodeType===1){if(/^(SCRIPT|STYLE)$/.test(root.tagName))return;element(root);}
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:function(n){return n.nodeType===1&&/^(SCRIPT|STYLE)$/.test(n.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    var n;while((n=w.nextNode()))n.nodeType===3?textNode(n):element(n);
  }
  function title(){var t=tr(document.title);if(t!=null)document.title=t;}
  // 엔진이 그리는 즉시(같은 마이크로태스크 안에서) 바꾼다. 이 관찰자가 cut-mode.js보다 먼저 만들어져야
  // 컷 높이 계산이 영어 글자 기준이 된다.
  var mo=new MutationObserver(function(records){
    for(var i=0;i<records.length;i++){
      var r=records[i];
      if(r.type==='characterData')textNode(r.target);
      else if(r.type==='attributes')element(r.target);
      else for(var j=0;j<r.addedNodes.length;j++)walk(r.addedNodes[j]);
    }
    title();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  function all(){walk(document.documentElement);title();}
  all();
  document.addEventListener('DOMContentLoaded',all);
})();
// 언어 바꾸기 단추: 페이지의 nav(또는 data-lang-slot) 끝에 붙인다
document.addEventListener('DOMContentLoaded',function(){
  var api=window.HOJEOGE_I18N;if(!api)return;
  var slot=document.querySelector('[data-lang-slot]')||document.querySelector('nav');
  if(!slot)return;
  var b=document.createElement('button');b.type='button';b.className='lang-toggle';b.setAttribute('data-no-i18n','');
  b.textContent=api.lang==='en'?'한국어':'English';
  b.setAttribute('lang',api.lang==='en'?'ko':'en');
  b.setAttribute('aria-label',api.lang==='en'?'한국어로 보기':'Read in English');
  b.onclick=function(){api.set(api.lang==='en'?'ko':'en');};
  slot.append(b);
});
