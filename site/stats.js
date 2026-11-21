// 방문 통계 (GoatCounter: 쿠키 없음, 개인정보 수집 없음).
// 코드(HOJEOGE_STATS)가 비어 있으면 아무것도 불러오지 않는다.
// 페이지 방문 + 다음 사건만 센다: 시즌 끝까지 읽음, 고른 선택지, 대사 끄기.
window.HOJEOGE_STATS=window.HOJEOGE_STATS||'';
(function(){
  const code=window.HOJEOGE_STATS;
  if(!code)return;
  window.goatcounter={no_onload:false,allow_local:false};
  const s=document.createElement('script');
  s.async=true;s.dataset.goatcounter='https://'+code+'.goatcounter.com/count';
  s.src='https://gc.zgo.at/count.js';
  document.head.appendChild(s);
  const sent=new Set();
  function track(name,once){
    if(once&&sent.has(name))return;sent.add(name);
    const go=()=>{try{window.goatcounter.count({path:name,title:name,event:true});}catch(e){}};
    if(window.goatcounter&&window.goatcounter.count)go();else s.addEventListener('load',go);
  }
  window.hojeogeTrack=track;
  const season=(location.pathname.match(/season-(\d)/)||[])[1];
  if(!season)return;
  document.addEventListener('DOMContentLoaded',()=>{
    const reader=document.querySelector('#reader');if(!reader)return;
    // 선택지: 시즌별로 어떤 선택이 많이 눌렸는지
    reader.addEventListener('click',e=>{
      const b=e.target.closest('.choices button');if(!b)return;
      const t=b.textContent.trim();
      if(/^(만화 읽기|다음 컷|이서의 마지막 호적|마지막 장면|다른 선택으로|방금 고른|시즌 \d)/.test(t))return;
      track('선택/S'+season+'/'+t.slice(0,40));
    },true);
    // 끝까지 읽음: 다음 시즌 이어 읽기 링크가 보이거나(1·2), 시즌 3 판결 화면에 시즌 4 예고가 나올 때
    // 실패 결말: 시즌 2·3의 '궁에 닿지 못함'·'궁에서 밀려나다'
    new MutationObserver(()=>{
      const html=reader.innerHTML;
      if(reader.querySelector('a[href="season-'+(+season+1)+'.html"]')||(season==='3'&&/시즌 4 · 궁 안의 이름/.test(html)))track('완주/S'+season,true);
      if(/궁에 닿지 못함|궁에서 밀려나다|창살 너머의 이름|돌아오지 않은 사람/.test(html))track('실패 결말/S'+season,true);
    }).observe(reader,{childList:true,subtree:true});
    // 대사 끄기
    document.addEventListener('click',e=>{const b=e.target.closest('.cut-voice');if(b&&/끄기/.test(b.textContent))track('대사 끄기',true);},true);
  });
})();
