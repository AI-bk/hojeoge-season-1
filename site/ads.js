// 페이지마다 맨 아래에 광고 한 칸을 둔다. 만화 컷과 선택 버튼 사이에는 넣지 않고,
// 장면이 바뀔 때 광고를 새로 고치지 않는다(페이지당 한 번만 요청).
(function(){
  var cfg=window.HOJEOGE_ADS||{};
  var client=/^ca-pub-\d{10,20}$/.test(cfg.client||'')?cfg.client:'';
  if(!client)return;
  var s=document.createElement('script');
  s.async=true;s.crossOrigin='anonymous';
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+client;
  document.head.appendChild(s);
  var slotId=/^\d{6,20}$/.test(cfg.slot||'')?cfg.slot:'';
  var box=document.getElementById('ad-slot');
  if(!slotId||!box)return;
  box.hidden=false;
  var ins=document.createElement('ins');
  ins.className='adsbygoogle';
  ins.style.display='block';
  ins.setAttribute('data-ad-client',client);
  ins.setAttribute('data-ad-slot',slotId);
  ins.setAttribute('data-ad-format','auto');
  ins.setAttribute('data-full-width-responsive','true');
  box.appendChild(ins);
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
})();
