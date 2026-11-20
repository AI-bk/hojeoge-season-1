// 페이지마다 맨 아래에 광고 한 칸을 둔다. 만화 컷과 선택 버튼 사이에는 넣지 않는다.
// 애드센스 정책(콘텐츠가 없는 화면에 광고 금지)에 따라, 글과 그림이 충분히 있는 화면에서만 광고를 연다.
// 시즌 페이지는 첫 화면(제목·안내)이 짧으므로, 만화 장면이 그려진 뒤에 한 번만 연다.
(function(){
  var cfg=window.HOJEOGE_ADS||{};
  var client=/^ca-pub-\d{10,20}$/.test(cfg.client||'')?cfg.client:'';
  if(!client)return;
  var slotId=/^\d{6,20}$/.test(cfg.slot||'')?cfg.slot:'';
  var box=document.getElementById('ad-slot');
  var reader=document.getElementById('reader');
  var loaded=false,shown=false;
  function loadScript(){
    if(loaded)return;loaded=true;
    var s=document.createElement('script');
    s.async=true;s.crossOrigin='anonymous';
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+client;
    document.head.appendChild(s);
  }
  function hasContent(){
    if(reader){
      if(reader.querySelector('.missing'))return false; // 이전 시즌 기록이 없을 때의 안내 화면
      var cuts=reader.querySelectorAll('section.comic-beat, figure.beat, section.frame, section.story-cut').length;
      return cuts>=2&&reader.textContent.replace(/\s+/g,'').length>=300;
    }
    var main=document.querySelector('main');
    return !!main&&main.textContent.replace(/\s+/g,'').length>=600;
  }
  function tryShow(){
    if(shown||!hasContent())return false;
    shown=true;loadScript();
    if(!slotId||!box)return true;
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
    return true;
  }
  if(tryShow()||!reader)return;
  var mo=new MutationObserver(function(){if(tryShow())mo.disconnect();});
  mo.observe(reader,{childList:true});
})();
