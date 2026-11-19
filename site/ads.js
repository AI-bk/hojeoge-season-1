// 결말 화면에서만 광고 한 칸을 보여 준다. 만화 컷과 선택 버튼 사이에는 넣지 않는다.
(function(){
  var cfg=window.HOJEOGE_ADS||{};
  var client=/^ca-pub-\d{10,20}$/.test(cfg.client||'')?cfg.client:'';
  if(!client)return;
  var s=document.createElement('script');
  s.async=true;s.crossOrigin='anonymous';
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+client;
  document.head.appendChild(s);
  var slotId=/^\d{6,20}$/.test(cfg.slot||'')?cfg.slot:'';
  var reader=document.getElementById('reader');
  var box=document.getElementById('ad-slot');
  if(!slotId||!reader||!box)return;
  var endings='.final-record,.gate-record,.verdict';
  var filled=false;
  function update(){
    var atEnding=!!reader.querySelector(endings);
    box.hidden=!atEnding;
    if(atEnding&&!filled){
      filled=true;
      var ins=document.createElement('ins');
      ins.className='adsbygoogle';
      ins.style.display='block';
      ins.setAttribute('data-ad-client',client);
      ins.setAttribute('data-ad-slot',slotId);
      ins.setAttribute('data-ad-format','auto');
      ins.setAttribute('data-full-width-responsive','true');
      box.appendChild(ins);
      try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
    }
  }
  new MutationObserver(update).observe(reader,{childList:true});
  update();
})();
