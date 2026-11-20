// 한 컷 보기: 화면에 만화 한 컷씩 보여 주고, 넘기기(스와이프·탭·버튼)로 다음 컷으로 간다.
// 시즌 1~3 공통. 각 시즌 스크립트가 #reader를 다시 그릴 때마다 컷을 다시 나눈다.
(function(){
  const reader=document.querySelector('#reader');
  if(!reader)return;
  const CUT='section.comic-beat, figure.beat, section.frame, section.story-cut, section.branch-cut';
  const KEY='hojeoge-cut-mode';
  const mq=window.matchMedia('(min-width: 0px)'); // 모든 화면에서 한 컷 보기 (넓은 화면은 그림·글을 나란히)
  let enabled=true;
  try{const v=localStorage.getItem(KEY);if(v!==null)enabled=v==='1';}catch(e){}
  let cuts=[],groups=[],index=0,busy=false,observer=null,moved=[];
  // 말풍선 보기: 글(해설 상자·대사 말풍선)과 선택지를 그림 위에 얹는다. 페이지가 body.overlay-cuts로 켠다.
  // 글이 그림을 넘치는 컷은 그 컷만 예전처럼 그림 아래에 글을 둔다.
  const overlayPage=document.body.classList.contains('overlay-cuts');
  const TEXT=':scope>.beat-text, :scope>.frame-body, :scope>.story-text, :scope>figcaption';
  const CHOICEY='.choices, .decision-question, .decision-stakes';

  const bar=document.createElement('nav');
  bar.className='cut-bar';
  bar.setAttribute('aria-label','컷 넘기기');
  bar.innerHTML='<button type="button" class="cut-prev" aria-label="이전 컷">‹ 이전</button>'+
    '<span class="cut-count" aria-live="polite"></span>'+
    '<button type="button" class="cut-next" aria-label="다음 컷">다음 ›</button>'+
    '<button type="button" class="cut-toggle">스크롤로 보기</button>';
  document.body.appendChild(bar);
  const prevBtn=bar.querySelector('.cut-prev'),nextBtn=bar.querySelector('.cut-next'),count=bar.querySelector('.cut-count'),toggle=bar.querySelector('.cut-toggle');

  function active(){return enabled&&mq.matches;}
  // 컷이 아닌 블록(제목, 선택지 등)을 앞뒤 컷에 붙인다.
  function split(){
    cuts=[...reader.querySelectorAll(CUT)].filter(c=>!c.parentElement.closest(CUT));
    groups=cuts.map(()=>[]);
    const loose=[];
    (function walk(node){
      for(const child of node.children){
        if(child.matches(CUT))continue;
        if(child.querySelector(CUT)){walk(child);continue;}
        loose.push(child);
      }
    })(reader);
    for(const el of loose){
      let owner=0;
      for(let i=0;i<cuts.length;i++){
        if(cuts[i].compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)owner=i;
      }
      // 첫 컷보다 앞에 있으면 첫 컷과 함께
      if(cuts.length&&!(cuts[0].compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))owner=0;
      if(groups[owner])groups[owner].push(el);
    }
  }
  function restore(){
    for(const m of moved.reverse()){try{m.parent.insertBefore(m.el,m.next&&m.next.parentNode===m.parent?m.next:null);}catch(e){}}
    moved=[];
    reader.querySelectorAll('.cut-choice-panel').forEach(el=>el.remove());
    reader.querySelectorAll('.cut-overlay').forEach(el=>el.classList.remove('cut-overlay','overlay-off','with-choices','choices-below'));
  }
  function overlay(cut,group){
    cut.classList.add('cut-overlay');
    const text=cut.querySelector(TEXT);
    const after=group.filter(el=>(cut.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)&&(el.matches(CHOICEY)||el.querySelector(CHOICEY)));
    let panel=null;
    if(after.length){
      panel=document.createElement('div');panel.className='cut-choice-panel';
      for(const el of after){moved.push({el,parent:el.parentNode,next:el.nextSibling});panel.append(el);}
      cut.append(panel);
    }else if(cut.querySelector('.choices')){panel=cut.querySelector('.choices');}
    if(panel)cut.classList.add('with-choices');
    if(observer)observer.takeRecords();
    // 그림 위에 다 들어가지 않으면 이 컷은 글을 그림 아래로
    const room=cut.clientHeight;
    const need=(text?[...text.children].filter(el=>!el.classList.contains('choices')).reduce((h,el)=>h+el.offsetHeight+6,20):0)+(panel?panel.offsetHeight:0);
    const textNeed=need-(panel?panel.offsetHeight:0);
    if(!text||room<120||textNeed>room+2)cut.classList.add('overlay-off');
    else if(need>room+2&&panel.classList.contains('cut-choice-panel')){ // 글은 그림 위, 선택지는 그림 바로 아래
      cut.style.setProperty('--art-h',room+'px');cut.classList.add('choices-below');
    }else if(need>room+2)cut.classList.add('overlay-off');
  }
  function show(){
    busy=true;
    restore();
    const on=active()&&cuts.length>1;
    document.documentElement.classList.toggle('cut-mode',on);
    bar.hidden=!mq.matches||cuts.length<2;
    toggle.textContent=enabled?'스크롤로 보기':'한 컷씩 보기';
    reader.querySelectorAll('.cut-hide,.cut-first').forEach(el=>el.classList.remove('cut-hide','cut-first'));
    if(cuts[0])cuts[0].classList.add('cut-first');
    if(on){
      cuts.forEach((c,i)=>{if(i!==index)c.classList.add('cut-hide');});
      groups.forEach((g,i)=>{if(i!==index)g.forEach(el=>el.classList.add('cut-hide'));});
      count.textContent=(index+1)+' / '+cuts.length;
      prevBtn.disabled=index===0;
      nextBtn.disabled=index===cuts.length-1;
      prevBtn.hidden=nextBtn.hidden=count.hidden=false;
      if(overlayPage&&cuts[index])overlay(cuts[index],groups[index]||[]);
    }else{
      prevBtn.hidden=nextBtn.hidden=count.hidden=true;
    }
    if(observer)observer.takeRecords();
    busy=false;
  }
  function go(i){
    if(!active())return;
    const n=Math.max(0,Math.min(cuts.length-1,i));
    if(n===index)return;
    index=n;show();
    const top=index===0?reader.getBoundingClientRect().top+window.scrollY-8:cuts[index].getBoundingClientRect().top+window.scrollY-8;
    window.scrollTo(0,Math.max(0,top));
  }
  function refresh(){
    moved=[];
    split();index=0;show();
    // 새 장면이 열리면 머리 단추들을 지나 장면 제목부터 보이게 한다
    if(active()&&cuts.length>1)window.scrollTo(0,Math.max(0,reader.getBoundingClientRect().top+window.scrollY-8));
  }

  prevBtn.onclick=()=>go(index-1);
  nextBtn.onclick=()=>go(index+1);
  toggle.onclick=()=>{
    enabled=!enabled;
    try{localStorage.setItem(KEY,enabled?'1':'0');}catch(e){}
    show();
    if(enabled)window.scrollTo(0,0);
  };
  // 그림을 누르면 다음 컷(왼쪽 3분의 1은 이전 컷)
  reader.addEventListener('click',e=>{
    if(!active()||e.target.closest('button,a,summary,details,input,label,.cut-choice-panel'))return;
    const cut=e.target.closest(CUT);
    if(!cut)return;
    const r=cut.getBoundingClientRect();
    go(e.clientX<r.left+r.width/3?index-1:index+1);
  });
  // 좌우로 밀어 넘기기
  let sx=0,sy=0,st=0;
  reader.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now();},{passive:true});
  reader.addEventListener('touchend',e=>{
    if(!active())return;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Date.now()-st<700&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?index+1:index-1);
  },{passive:true});
  document.addEventListener('keydown',e=>{
    if(!active()||e.target.closest('input,textarea'))return;
    if(e.key==='ArrowRight')go(index+1);
    if(e.key==='ArrowLeft')go(index-1);
  });

  let queued=false;
  observer=new MutationObserver(()=>{
    if(busy||queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh();});
  });
  observer.observe(reader,{childList:true});
  if(overlayPage)window.addEventListener('resize',()=>{if(active())show();});
  mq.addEventListener?mq.addEventListener('change',show):mq.addListener(show);
  refresh();
})();
