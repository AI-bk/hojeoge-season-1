// 대사 듣기: 지금 보이는 컷의 말풍선 대사를 성우 음성(site/voice/*.mp3)으로 읽는다.
// voice-lines.js(VOICE_LINES)에 있는 대사만 소리가 나고, 없는 대사는 조용히 넘어간다.
(function(){
  const lines=typeof VOICE_LINES==='object'&&VOICE_LINES?VOICE_LINES:{};
  if(!Object.keys(lines).length)return; // 녹음이 하나도 없으면 버튼도 만들지 않는다
  const reader=document.querySelector('#reader');
  if(!reader)return;
  const KEY='hojeoge-voice';
  const CUT='section.comic-beat, figure.beat, section.frame, section.story-cut, section.branch-cut';
  const BUBBLE='.dialogue, .talk, .speech';
  // 기본은 자동 재생. 「대사 끄기」를 누른 사람만 꺼진 채로 기억한다
  let on=true;try{on=localStorage.getItem(KEY)!=='0';}catch(e){}
  const player=new Audio();player.preload='auto';
  let queue=[],lastCut=null,ducked=[];

  function norm(t){return t.replace(/[“”"]/g,'').replace(/\s+/g,' ').trim();}
  function lineOf(el){const q=el.querySelector('blockquote, q');return q?norm(q.textContent):'';}
  // 같은 대사를 여러 인물이 말할 수 있으면(시즌 2의 동행) '인물|대사'로 먼저 찾는다
  function idOf(el){const t=lineOf(el);if(!t)return null;const s=el.querySelector('strong, cite, .who');const who=s?norm(s.textContent):'';return (who&&lines[who+'|'+t])||lines[t]||null;}
  function duck(down){
    if(down){ducked=[...document.querySelectorAll('audio')].filter(a=>a!==player&&!a.paused);ducked.forEach(a=>{a.dataset.vol=a.volume;a.volume=Math.min(a.volume,0.25);});}
    else{ducked.forEach(a=>{a.volume=+a.dataset.vol||1;});ducked=[];}
  }
  function stop(){queue=[];player.pause();duck(false);}
  function next(){
    const id=queue.shift();
    if(!id){duck(false);return;}
    player.src='voice/'+id+'.mp3';
    player.play().then(()=>duck(true)).catch(()=>{queue=[];});
  }
  player.addEventListener('ended',next);
  // 휴대폰은 첫 터치 전엔 소리를 막는다: 첫 터치 때 무음을 한 번 재생해 재생 권한을 받아 둔다
  let unlocked=false;
  const SILENT='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  function unlock(){
    if(unlocked)return;unlocked=true;
    if(!player.src||player.paused){const keep=player.src;player.src=SILENT;player.play().then(()=>{player.pause();if(keep)player.src=keep;if(on){lastCut=null;check();}}).catch(()=>{unlocked=false;});}
  }
  ['touchend','click','keydown'].forEach(t=>document.addEventListener(t,unlock,{capture:true,passive:true}));
  function current(){
    const cuts=[...reader.querySelectorAll(CUT)].filter(c=>!c.classList.contains('cut-hide')&&c.offsetParent);
    return document.documentElement.classList.contains('cut-mode')?cuts[0]:null;
  }
  function speak(cut){
    stop();
    queue=[...cut.querySelectorAll(BUBBLE)].map(idOf).filter(Boolean);
    cut.querySelectorAll(BUBBLE).forEach(b=>{if(idOf(b))b.classList.add('has-voice');});
    next();
  }
  function check(){
    const cut=current();
    if(cut===lastCut)return;
    lastCut=cut;
    if(cut)cut.querySelectorAll(BUBBLE).forEach(b=>{if(idOf(b))b.classList.add('has-voice');});
    if(on&&cut)speak(cut);else stop();
  }
  // 말풍선을 누르면 그 대사만 다시 듣는다
  reader.addEventListener('click',e=>{
    const b=e.target.closest(BUBBLE);if(!b)return;
    const id=idOf(b);if(!id)return;
    e.stopPropagation();stop();queue=[id];next();
  },true);
  new MutationObserver(()=>requestAnimationFrame(check)).observe(reader,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});

  function addButton(){
    const bar=document.querySelector('.cut-bar');
    if(!bar){setTimeout(addButton,300);return;}
    const btn=document.createElement('button');
    btn.type='button';btn.className='cut-voice';
    const paint=()=>{btn.textContent=on?'대사 끄기':'대사 듣기';btn.setAttribute('aria-pressed',on?'true':'false');};
    btn.onclick=()=>{on=!on;try{localStorage.setItem(KEY,on?'1':'0');}catch(e){}paint();lastCut=null;if(on)check();else stop();};
    paint();
    bar.insertBefore(btn,bar.querySelector('.cut-toggle'));
  }
  addButton();
})();
