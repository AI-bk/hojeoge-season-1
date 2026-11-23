// 영어 화면으로 시즌을 무작위로 읽으며 번역이 빠진 문장을 찾는다.
// 사용법: (site/를 8765로 띄운 뒤) node tools/i18n-missing.cjs <시즌 번호들, 예: 1,2> [회차, 기본 10]
const {chromium}=require('playwright');
const seasons=(process.argv[2]||'1').split(',').map(Number),runs=+process.argv[3]||10;
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({locale:'en-US'});const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/pagead2.googlesyndication.com/**',r=>r.fulfill({status:200,body:''}));
  await p.goto('http://localhost:8765/about.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('hojeoge-lang','en');});
  const missing=new Map();let voiced=0,lines=0;
  for(let e=0;e<runs;e++)for(const s of [1,2,3,4]){
    const page='season-'+s+'.html';
    await p.evaluate(src=>{document.body.innerHTML='<iframe id="f" src="'+src+'" style="width:390px;height:844px"></iframe>';},page);
    await p.waitForFunction(page=>{const f=document.getElementById('f');return f&&f.contentWindow&&f.contentWindow.location.pathname.endsWith(page)&&f.contentDocument.readyState==='complete';},page);
    await p.waitForTimeout(150);
    const f=p.frames().find(x=>x.url().endsWith(page));
    const r=await f.evaluate(([check,n])=>{
      let ends=0,v=0,l=0;
      const tally=()=>{for(const q of document.querySelectorAll('#reader .speech q, #reader .dialogue q, #reader .talk q, #reader blockquote')){l++;const ko=q.getAttribute('data-ko')||q.textContent;if(typeof VOICE_LINES==='object'&&VOICE_LINES[ko.replace(/[“”"]/g,'').replace(/\s+/g,' ').trim()])v++;}};
      for(let k=0;k<n*80&&ends<n;k++){
        if(check)tally();
        const bs=[...document.querySelectorAll('#reader button')].filter(b=>!b.disabled);
        if(!bs.length)break;
        const re=bs.filter(b=>/start|again|Read again|Reread|처음부터|다시 읽기/i.test(b.textContent));
        const pick=bs.filter(b=>!re.includes(b));
        if(!pick.length)ends++;
        const list=pick.length?pick:re;list[Math.floor(Math.random()*list.length)].click();
      }
      return {missing:[...HOJEOGE_I18N.missing],v,l};
    },[seasons.includes(s),runs]);
    if(seasons.includes(s)){voiced+=r.v;lines+=r.l;for(const m of r.missing)missing.set(m,s);}
  }
  console.log('missing',missing.size);for(const [m,s] of missing)console.log('s'+s+'\t'+m);
  console.log('speech bubbles seen',lines,'with Korean voice found',voiced,'errors',errs.slice(0,3));
  await b.close();
})();
